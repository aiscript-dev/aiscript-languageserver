import { Ast } from "@syuilo/aiscript/index.js";
import { AiAlreadyDeclaredVariableError } from "../errors/AiTypeError.js";
import { TypeValue, ident, primitiveType } from "./TypeValue.js";
import { Variable } from "./Variable.js";
import { installStdTypes } from "./std/index.js";

export class Scope {
  constructor(
    private parent?: Scope,
    private types = new Map<string, TypeValue>(),
    private variables = new Map<string, Variable>(),
    private overridedVariables = new Map<string, Variable>()
  ) {}

  copy() {
    return new Scope(this.parent, new Map(this.types), new Map(this.variables));
  }

  createChild() {
    return new Scope(this);
  }

  createNamespace(name: string) {
    return new NamespaceScope(name, this);
  }

  declareType(ident: Ast.Identifier, type: TypeValue) {
    this.types.set(ident.name, type);
  }

  getType(ident: Ast.Identifier): TypeValue | null {
    return this.parent?.getType(ident) ?? this.types.get(ident.name) ?? null;
  }

  hasType(ident: Ast.Identifier): boolean {
    return this.parent?.hasType(ident) || this.types.has(ident.name);
  }

  defineVariable(ident: Ast.Identifier, variable: Variable) {
    if (this.variables.has(ident.name)) {
      return new AiAlreadyDeclaredVariableError(ident.name, ident.loc);
    }

    this.variables.set(ident.name, variable);
  }

  overrideVariable(ident: Ast.Identifier, variable: Variable) {
    this.overridedVariables.set(ident.name, variable);
  }

  getVariable(ident: Ast.Identifier): Variable | null {
    return (
      this.overridedVariables.get(ident.name) ??
      this.parent?.getVariable(ident) ??
      this.variables.get(ident.name) ??
      null
    );
  }

  hasVariable(ident: Ast.Identifier): boolean {
    return this.parent?.hasVariable(ident) ?? this.variables.has(ident.name);
  }

  isDeclared(name: string): boolean {
    return this.variables.has(name);
  }
}

export class NamespaceScope extends Scope {
  constructor(
    public namespace: string,
    private _parent: Scope,
    types = new Map<string, TypeValue>(),
    private _variables = new Map<string, Variable>()
  ) {
    super(_parent, types, _variables);
  }

  defineVariable(ident: Ast.Identifier, variable: Variable) {
    if (this._variables.has(ident.name) == null) {
      return new AiAlreadyDeclaredVariableError(ident.name, ident.loc);
    }

    this._variables.set(ident.name, variable);

    return this._parent.defineVariable(
      {
        type: "identifier",
        name: this.namespace + ":" + ident.name,
        loc: ident.loc,
      },
      variable
    );
  }
}

export function createGlobalScope() {
  const scope = new Scope();

  scope.declareType(ident("void"), primitiveType("null"));

  installStdTypes(scope);

  return scope;
}
