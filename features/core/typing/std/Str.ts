import { Scope } from "../Scope.js";
import { fnType, ident, primitiveType } from "../TypeValue.js";

export function installStrTypes(scope: Scope) {
  scope.defineVariable(ident("Str:lf"), {
    isMut: false,
    type: primitiveType("str"),
  });

  scope.defineVariable(ident("Str:lt"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: primitiveType("str") },
        { isOptional: false, type: primitiveType("str") },
      ],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Str:gt"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: primitiveType("str") },
        { isOptional: false, type: primitiveType("str") },
      ],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Str:from_codepoint"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("str")
    ),
  });
}
