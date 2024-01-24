import { Ast } from "@syuilo/aiscript/index.js";
import { TypeError } from "../index.js";
import { Scope } from "./Scope.js";
import {
  FunctionType,
  PrimitiveTypeName,
  TypeValue,
  primitiveType,
  primitiveTypeNames,
  union,
} from "./TypeValue.js";
import {
  AiTypeError,
  AiNotAssignableTypeError,
  AiAlreadyDeclaredVariableError,
  AiCanNotCallError,
  AiMissingArgumentError,
  AiInvalidArgumentError,
  AiCanNotAssignToImmutableVariableError,
  AiCanNotReadPropertyError,
} from "../errors/AiTypeError.js";
import { excludeDuplicatedType } from "../utils/excludeDuplicatedType.js";

export class TypeChecker {
  constructor(public globalScope: Scope = new Scope()) {}

  /** 型を文字の表現に戻す */
  reprType(type: TypeValue, indent = 0): string {
    const ws = "  ".repeat(indent);

    switch (type.type) {
      case "PrimitiveType":
      case "PrimitiveType": {
        let res = type.name;
        if ("inner" in type && type.inner) {
          res += `<${this.reprType(type)}>`;
        }

        return res;
      }

      case "AnyType": {
        return "any";
      }

      case "PrimitiveType": {
        return type.name;
      }

      case "FunctionType": {
        return `@(${type.params
          .map((x) =>
            // オプショナルな引数を表現する構文は無いのでとりあえず ? を付けてる
            x.isOptional ? `${this.reprType(x.type)}?` : this.reprType(x.type)
          )
          .join(", ")}) => ${this.reprType(type.returnType)}`;
      }

      case "NothingType": {
        return "<:NothingType:>";
      }

      case "UnionType": {
        return type.contents.map((x) => this.reprType(x)).join(" | ");
      }

      case "ObjectType": {
        if (type.items instanceof Map) {
          return `{\n${ws}  ${[...type.items.entries()]
            .map(
              ([name, type]) => `${name}: ${this.reprType(type, indent + 1)}`
            )
            .join(`\n${ws}  `)}\n${ws}}`;
        } else {
          return `obj<${this.reprType(type.items)}>`;
        }
      }

      case "ArrayType": {
        return `arr<${this.reprType(type.item)}>`;
      }

      case "ErrorType": {
        return "error";
      }
    }
  }

  runBlock(
    statements: Ast.Node[],
    scope: Scope,
    errors: TypeError[]
  ): TypeValue {
    let returnType: TypeValue = {
      type: "PrimitiveType",
      name: "null",
    };

    loop: for (const tree of statements) {
      switch (tree.type) {
        case "return": {
          returnType = this.run(tree.expr, scope, errors) ?? returnType;

          break loop;
        }

        case "break":
        case "continue": {
          break loop;
        }

        default: {
          returnType = this.run(tree, scope, errors) ?? returnType;
          break;
        }
      }
    }

    return returnType;
  }

  /** インタープリターがASTを実行してゆくように、型チェックを行う */
  run(node: Ast.Node, scope: Scope, errors: TypeError[]): TypeValue | null {
    if (Ast.isStatement(node)) {
      return this.runStmt(node, scope, errors);
    } else if (Ast.isExpression(node)) {
      return this.runExpr(node, scope, errors);
    } else if (node.type == "namedTypeSource" || node.type == "fnTypeSource") {
      return this.inferFromTypeSource(node, scope, errors);
    } else {
      return null;
    }
  }

  runStmt(
    ast: Ast.Statement,
    scope: Scope,
    errors: TypeError[]
  ): TypeValue | null {
    switch (ast.type) {
      case "def": {
        if (scope.isDeclared(ast.name)) {
          errors.push(new AiAlreadyDeclaredVariableError(ast.name, ast.loc));
        }

        let type: TypeValue;
        if (ast.varType) {
          type = this.inferFromTypeSource(ast.varType, scope, errors);
          const exprType = this.runExpr(ast.expr, scope, errors);

          if (!this.isAssignableType(type, exprType)) {
            errors.push(
              new AiNotAssignableTypeError(
                this.reprType(type),
                this.reprType(exprType),
                ast.loc
              )
            );
          }
        } else {
          type = this.runExpr(ast.expr, scope, errors);
        }

        const res = scope.defineVariable(
          { type: "identifier", name: ast.name, loc: ast.loc },
          {
            isMut: ast.mut,
            type: type,
          }
        );

        if (res instanceof AiTypeError) {
          errors.push(res);
        }

        return null;
      }

      case "addAssign":
      case "subAssign":
      case "assign": {
        if (ast.dest.type === "identifier") {
          const variable = scope.getVariable(ast.dest);

          if (variable?.isMut === false) {
            errors.push(
              new AiCanNotAssignToImmutableVariableError(
                ast.dest.name,
                ast.dest.loc
              )
            );
          }
        }

        const dest = this.runExpr(ast.dest, scope, errors);
        const value = this.runExpr(ast.expr, scope, errors);

        if (ast.dest.type == "identifier" && dest.type == "NothingType") {
          const variable = scope.getVariable(ast.dest);

          scope.overrideVariable(ast.dest, {
            isMut: variable?.isMut ?? false,
            type: value,
          });

          return null;
        }

        if (!this.isAssignableType(dest, value)) {
          errors.push(
            new AiNotAssignableTypeError(
              this.reprType(dest),
              this.reprType(value),
              ast.loc
            )
          );
        }

        return null;
      }
    }

    return null;
  }

  runExpr(ast: Ast.Expression, scope: Scope, errors: TypeError[]): TypeValue {
    switch (ast.type) {
      case "fn": {
        const childScope = scope.createChild();
        const params: FunctionType["params"] = [];

        // TODO: rustのように、NothingTypeをどう扱われるのかで型を推論できるように
        for (const param of ast.args) {
          let paramType: TypeValue;
          if (param.argType) {
            paramType = this.inferFromTypeSource(param.argType, scope, errors);
          } else {
            paramType = { type: "NothingType" };
          }

          params.push({
            isOptional: false,
            type: paramType,
          });

          const err = childScope.defineVariable(
            { type: "identifier", name: param.name, loc: ast.loc },
            {
              isMut: true,
              type: paramType,
            }
          );
          if (err) errors.push(err);
        }

        let returnType: TypeValue;
        if (ast.retType) {
          returnType = this.inferFromTypeSource(ast.retType, scope, errors);
          const realType = this.runBlock(ast.children, childScope, errors);

          if (!this.isAssignableType(returnType, realType)) {
            errors.push(
              new AiNotAssignableTypeError(
                this.reprType(returnType),
                this.reprType(realType),
                ast.loc
              )
            );
          }
        } else {
          returnType = this.runBlock(ast.children, childScope, errors);
        }

        return {
          type: "FunctionType",
          params: params,
          returnType: returnType,
        };
      }

      case "block": {
        return this.runBlock(ast.statements, scope.createChild(), errors);
      }

      case "call": {
        const target = this.runExpr(ast.target, scope, errors);
        if (!this.isCallableType(target)) {
          errors.push(new AiCanNotCallError(this.reprType(target), ast.loc));
        } else if (target.type === "FunctionType") {
          for (let i = 0; i < target.params.length; i++) {
            if (i < ast.args.length) {
              const dest = target.params[i].type;
              const value = this.runExpr(ast.args[i], scope, errors);

              if (!this.isAssignableType(dest, value)) {
                errors.push(
                  new AiInvalidArgumentError(
                    i,
                    this.reprType(dest),
                    this.reprType(value),
                    ast.loc
                  )
                );
              }
            } else if (!target.params[i].isOptional) {
              errors.push(
                new AiMissingArgumentError(
                  i,
                  this.reprType(target.params[i].type),
                  ast.loc
                )
              );
            }
          }

          return target.returnType;
        }

        return {
          type: "AnyType",
        };
      }

      case "str": {
        return {
          type: "PrimitiveType",
          name: "str",
        };
      }

      case "num": {
        return {
          type: "PrimitiveType",
          name: "num",
        };
      }

      case "bool": {
        return {
          type: "PrimitiveType",
          name: "bool",
        };
      }

      case "null": {
        return {
          type: "PrimitiveType",
          name: "null",
        };
      }

      case "arr": {
        let itemType: TypeValue;
        const itemTypes = ast.value.map((x) => this.runExpr(x, scope, errors));

        if (ast.value.length == 0 || itemTypes.length === 0) {
          itemType = { type: "AnyType" };
        } else if (itemTypes.length === 1) {
          itemType = itemTypes[0];
        } else {
          itemType = {
            type: "UnionType",
            contents: excludeDuplicatedType(itemTypes, this),
          };
        }

        return {
          type: "ArrayType",
          item: itemType,
        };
      }

      case "obj": {
        const items = new Map<string, TypeValue>();

        for (const [name, expr] of ast.value) {
          items.set(name, this.runExpr(expr, scope, errors));
        }

        return {
          type: "ObjectType",
          items,
        };
      }

      case "identifier": {
        const variable = scope.getVariable(ast);

        if (variable == null) {
          return {
            type: "AnyType",
          };
        }

        return variable.type;
      }

      case "prop": {
        const target = this.runExpr(ast.target, scope, errors);

        if (target.type == "ObjectType") {
          if (target.items instanceof Map) {
            return (
              target.items.get(ast.name) ?? {
                type: "AnyType",
              }
            );
          } else {
            return target.items;
          }
        } else {
          errors.push(
            new AiCanNotReadPropertyError(
              this.reprType(target),
              ast.name,
              ast.loc
            )
          );

          return {
            type: "AnyType",
          };
        }
      }

      case "index": {
        const target = this.runExpr(ast.target, scope, errors);
        const indexType = this.runExpr(ast.index, scope, errors);

        if (target.type == "ObjectType") {
          if (target.items instanceof Map) {
            return union(...excludeDuplicatedType(target.items.values(), this));
          } else {
            return target.items;
          }
        } else if (target.type == "ArrayType") {
          return target.item;
        } else {
          errors.push(
            new AiCanNotReadPropertyError(
              this.reprType(target),
              this.reprType(indexType),
              ast.loc
            )
          );

          return {
            type: "AnyType",
          };
        }
      }

      case "and": {
        const left = this.runExpr(ast.left, scope, errors);
        const right = this.runExpr(ast.right, scope, errors);

        if (!this.isAssignableType(primitiveType("bool"), left)) {
          errors.push(
            new AiNotAssignableTypeError(
              this.reprType(primitiveType("bool")),
              this.reprType(left),
              ast.left.loc
            )
          );
        }

        if (!this.isAssignableType(primitiveType("bool"), right)) {
          errors.push(
            new AiNotAssignableTypeError(
              this.reprType(primitiveType("bool")),
              this.reprType(right),
              ast.right.loc
            )
          );
        }

        return primitiveType("bool");
      }

      case "or": {
        const left = this.runExpr(ast.left, scope, errors);
        const right = this.runExpr(ast.right, scope, errors);

        if (!this.isAssignableType(primitiveType("bool"), left)) {
          errors.push(
            new AiNotAssignableTypeError(
              this.reprType(primitiveType("bool")),
              this.reprType(left),
              ast.left.loc
            )
          );
        }

        if (!this.isAssignableType(primitiveType("bool"), right)) {
          errors.push(
            new AiNotAssignableTypeError(
              this.reprType(primitiveType("bool")),
              this.reprType(right),
              ast.right.loc
            )
          );
        }

        return primitiveType("bool");
      }

      case "not": {
        const expr = this.runExpr(ast.expr, scope, errors);

        if (!this.isAssignableType(primitiveType("bool"), expr)) {
          errors.push(
            new AiNotAssignableTypeError(
              this.reprType(primitiveType("bool")),
              this.reprType(expr),
              ast.expr.loc
            )
          );
        }

        return primitiveType("bool");
      }

      case "exists": {
        return primitiveType("bool");
      }

      case "if": {
        this.runExpr(ast.cond, scope, errors);

        const res = [];

        res.push(this.run(ast.then, scope, errors));

        for (const tree of ast.elseif) {
          this.runExpr(tree.cond, scope, errors);

          res.push(this.run(tree.then, scope, errors));
        }

        if (ast.else) {
          res.push(this.run(ast.else, scope, errors));
        }

        return union(
          ...excludeDuplicatedType(
            res.filter((x): x is typeof x & {} => x != null),
            this
          )
        );
      }

      default: {
        return {
          type: "AnyType",
        };
      }
    }
  }

  /** `dest`に`value`が代入可能であるか */
  isAssignableType(dest: TypeValue, value: TypeValue): boolean {
    if (value.type === "AnyType") {
      return true;
    } else if (dest.type === "AnyType") {
      return true;
    }

    if (dest.type === "ErrorType" && value.type == "ErrorType") {
      return true;
    }

    if (dest.type === "FunctionType" && value.type === "FunctionType") {
      if (dest.params.length !== value.params.length) {
        return false;
      }

      for (let i = 0; i < dest.params.length; i++) {
        const x = dest.params[i];
        const y = value.params[i];

        if (x.isOptional && !y.isOptional) return false;

        if (!this.isAssignableType(x.type, y.type)) return false;
      }

      return true;
    }

    if (dest.type === "PrimitiveType" && value.type === "PrimitiveType") {
      return dest.name === value.name;
    }

    if (dest.type === "ObjectType" && value.type === "ObjectType") {
      if (dest.items instanceof Map && value.items instanceof Map) {
        for (const [name, destType] of dest.items) {
          const valueType = value.items.get(name);

          if (!valueType || !this.isAssignableType(destType, valueType))
            return false;
        }

        return true;
      } else if (dest.items instanceof Map) {
        const valueType =
          value.items instanceof Map
            ? union(...excludeDuplicatedType(value.items.values(), this))
            : value.items;

        for (const [_, destType] of dest.items) {
          if (!this.isAssignableType(destType, valueType)) return false;
        }

        return true;
      } else if (value.items instanceof Map) {
        const destType =
          dest.items instanceof Map
            ? union(...excludeDuplicatedType(dest.items.values(), this))
            : dest.items;

        for (const [_, valueType] of value.items) {
          if (!this.isAssignableType(destType, valueType)) return false;
        }

        return true;
      } else {
        const destValue =
          dest.items instanceof Map
            ? union(...excludeDuplicatedType(dest.items.values(), this))
            : dest.items;

        const valueType =
          value.items instanceof Map
            ? union(...excludeDuplicatedType(value.items.values(), this))
            : value.items;

        return this.isAssignableType(destValue, valueType);
      }
    }

    if (dest.type === "ArrayType" && value.type === "ArrayType") {
      return this.isAssignableType(dest.item, value.item);
    }

    if (dest.type === "UnionType" && value.type !== "UnionType") {
      for (const destType of dest.contents) {
        if (this.isAssignableType(destType, value)) return true;
      }

      return false;
    } else if (dest.type === "UnionType" && value.type === "UnionType") {
      for (const valueType of value.contents) {
        if (!this.isAssignableType(dest, valueType)) return false;
      }

      return true;
    }

    return false;
  }

  /** 呼び出し可能な型なのかチェック */
  isCallableType(type: TypeValue): boolean {
    if (type.type === "AnyType") return true;
    if (type.type === "FunctionType") return true;

    return false;
  }

  /** 型の表現から、型を生成 */
  inferFromTypeSource(
    ast: Ast.TypeSource,
    scope: Scope,
    errors: TypeError[]
  ): TypeValue {
    switch (ast.type) {
      case "namedTypeSource": {
        if (primitiveTypeNames.some((x) => x === ast.name)) {
          return {
            type: "PrimitiveType",
            name: ast.name as PrimitiveTypeName,
          };
        } else if (ast.name === "obj") {
          return {
            type: "ObjectType",
            items: ast.inner
              ? this.inferFromTypeSource(ast.inner, scope, errors)
              : { type: "AnyType" },
          };
        } else if (ast.name === "arr") {
          return {
            type: "ArrayType",
            item: ast.inner
              ? this.inferFromTypeSource(ast.inner, scope, errors)
              : { type: "AnyType" },
          };
        }

        return {
          type: "AnyType",
        };
      }

      case "fnTypeSource": {
        return {
          type: "FunctionType",
          params: ast.args.map((x) => ({
            isOptional: false,
            type: this.inferFromTypeSource(x, scope, errors),
          })),
          returnType: this.inferFromTypeSource(ast.result, scope, errors),
        };
      }
    }
  }

  preRunBlock(body: Ast.Node[], scope: Scope, errors: TypeError[]) {
    for (const node of body) {
      switch (node.type) {
        case "ns": {
          this.preRun(node, scope, errors);
          break;
        }
      }
    }
  }

  preRun(node: Ast.Node, scope: Scope, errors: TypeError[]) {
    switch (node.type) {
      case "ns": {
        this.preRunBlock(
          node.members,
          scope.createNamespace(node.name),
          errors
        );
        return;
      }

      case "def": {
        this.run(node, scope, errors);
      }
    }
  }
}
