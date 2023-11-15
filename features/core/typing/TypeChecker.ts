import { Ast } from "@syuilo/aiscript";
import { TypeError } from "../index.js";
import { Scope } from "./Scope.js";
import { TypeValue } from "./TypeValue.js";
import {
  AiTypeError,
  AiNotAssignableTypeError,
  AiAlreadyDeclaredVariableError,
  AiCanNotCallError,
  AiMissingArgumentError,
  AiInvalidArgumentError,
  AiCanNotAssignToImmutableVariableError,
} from "../errors/AiTypeError.js";

export class TypeChecker {
  constructor(public globalScope: Scope = new Scope()) {}

  /** 型を文字の表現に戻す */
  reprType(type: TypeValue): string {
    switch (type.type) {
      case "NamedType": {
        let res = type.name;
        if (type.inner) {
          res += `<${this.reprType(type)}>`;
        }

        return res;
      }

      case "FunctionType": {
        return `@(${type.params
          .map((x) => this.reprType(x))
          .join(", ")}) => ${this.reprType(type.returnType)}`;
      }

      case "NothingType": {
        return "<:NothingType:>";
      }
    }
  }

  runBlock(
    statements: Ast.Node[],
    scope: Scope,
    errors: TypeError[]
  ): TypeValue {
    let returnType: TypeValue = {
      type: "NamedType",
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
        const params: TypeValue[] = [];

        // rustのように、NothingTypeをどう扱われるのかで型を推論できるように
        for (const param of ast.args) {
          let paramType: TypeValue;
          if (param.argType) {
            paramType = this.inferFromTypeSource(param.argType, scope, errors);
          } else {
            paramType = { type: "NothingType" };
          }

          params.push(paramType);

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
              const dest = target.params[i];
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
            } else {
              errors.push(
                new AiMissingArgumentError(
                  i,
                  this.reprType(target.params[i]),
                  ast.loc
                )
              );
            }
          }

          return target.returnType;
        }

        return {
          type: "NamedType",
          name: "any",
        };
      }

      case "str": {
        return {
          type: "NamedType",
          name: "str",
        };
      }

      case "num": {
        return {
          type: "NamedType",
          name: "num",
        };
      }

      case "bool": {
        return {
          type: "NamedType",
          name: "bool",
        };
      }

      case "null": {
        return {
          type: "NamedType",
          name: "null",
        };
      }

      case "arr": {
        return {
          type: "NamedType",
          name: "arr",
        };
      }

      case "obj": {
        return {
          type: "NamedType",
          name: "obj",
        };
      }

      case "identifier": {
        return (
          scope.getVariable(ast)?.type ?? {
            type: "NamedType",
            name: "any",
          }
        );
      }

      default: {
        return {
          type: "NamedType",
          name: "any",
        };
      }
    }
  }

  /** `dest`に`value`が代入可能であるか確認 */
  isAssignableType(dest: TypeValue, value: TypeValue): boolean {
    if (
      (dest.type === "NamedType" && dest.name === "any") ||
      (value.type === "NamedType" && value.name === "any")
    ) {
      return true;
    }

    if (dest.type === "FunctionType" && value.type === "FunctionType") {
      if (dest.params.length !== value.params.length) {
        return false;
      }

      for (let i = 0; i < dest.params.length; i++) {
        const x = dest.params[i];
        const y = value.params[i];

        if (!this.isAssignableType(x, y)) return false;
      }

      return true;
    }

    if (dest.type === "NamedType" && value.type === "NamedType") {
      if (dest.name !== value.name) return false;

      if (dest.inner && value.inner)
        return this.isAssignableType(dest.inner, value.inner);

      return true;
    }

    return false;
  }

  /** 呼び出し可能な型なのかチェック */
  isCallableType(type: TypeValue): boolean {
    if (type.type === "NamedType" && type.name === "any") return true;

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
        const inner =
          ast.inner && this.inferFromTypeSource(ast.inner, scope, errors);

        return {
          type: "NamedType",
          name: ast.name,
          inner: inner,
        };
      }

      case "fnTypeSource": {
        return {
          type: "FunctionType",
          params: ast.args.map((x) =>
            this.inferFromTypeSource(x, scope, errors)
          ),
          returnType: this.inferFromTypeSource(ast.result, scope, errors),
        };
      }
    }
  }

  preRunBlock(body: Ast.Node[], scope: Scope, errors: TypeError[]) {
    for (const node of body) {
      this.preRun(node, scope, errors);
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
