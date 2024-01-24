import { Scope } from "../Scope.js";
import { fnType, ident, primitiveType } from "../TypeValue.js";

export function installNumTypes(scope: Scope) {
  scope.defineVariable(ident("Num:to_hex"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("str")
    ),
  });

  scope.defineVariable(ident("Num:from_hex"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("str") }],
      primitiveType("num")
    ),
  });
}
