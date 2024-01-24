import { Scope } from "../Scope.js";
import { fnType, ident, primitiveType, union } from "../TypeValue.js";

export function installDateTypes(scope: Scope) {
  scope.defineVariable(ident("Date:now"), {
    isMut: false,
    type: fnType([], primitiveType("str")),
  });

  scope.defineVariable(ident("Date:year"), {
    isMut: false,
    type: fnType(
      [{ isOptional: true, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Date:month"), {
    isMut: false,
    type: fnType(
      [{ isOptional: true, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Date:day"), {
    isMut: false,
    type: fnType(
      [{ isOptional: true, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Date:hour"), {
    isMut: false,
    type: fnType(
      [{ isOptional: true, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Date:minute"), {
    isMut: false,
    type: fnType(
      [{ isOptional: true, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Date:second"), {
    isMut: false,
    type: fnType(
      [{ isOptional: true, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Date:parse"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("str") }],
      primitiveType("num")
    ),
  });
}
