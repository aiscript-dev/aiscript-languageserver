import { Scope } from "../Scope.js";
import { fnType, ident, primitiveType } from "../TypeValue.js";

export function installUtilTypes(scope: Scope) {
  scope.defineVariable(ident("Util:uuid"), {
    isMut: false,
    type: fnType([], primitiveType("str")),
  });
}
