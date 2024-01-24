import { Scope } from "../Scope.js";
import {
  anyType,
  errorType,
  fnType,
  ident,
  primitiveType,
  union,
} from "../TypeValue.js";

export function installJsonTypes(scope: Scope) {
  scope.defineVariable(ident("Json:stringify"), {
    isMut: false,
    type: fnType([{ isOptional: false, type: anyType }], primitiveType("str")),
  });

  scope.defineVariable(ident("Json:parse"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("str") }],
      union(anyType, errorType(anyType))
    ),
  });

  scope.defineVariable(ident("Json:parseable"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("str") }],
      primitiveType("bool")
    ),
  });
}
