import { Scope } from "../Scope.js";
import {
  anyType,
  arrayType,
  fnType,
  ident,
  primitiveType,
} from "../TypeValue.js";

export function installCoreTypes(scope: Scope) {
  scope.defineVariable(ident("help"), {
    isMut: false,
    type: primitiveType("str"),
  });

  scope.defineVariable(ident("Core:ai"), {
    isMut: false,
    type: primitiveType("str"),
  });

  scope.defineVariable(ident("Core:v"), {
    isMut: false,
    type: primitiveType("str"),
  });

  scope.defineVariable(ident("Core:not"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("bool") }],
      primitiveType("bool")
    ),
  });

  scope.defineVariable(ident("Core:eq"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: anyType },
        { isOptional: false, type: anyType },
      ],
      primitiveType("bool")
    ),
  });

  scope.defineVariable(ident("Core:neq"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: anyType },
        { isOptional: false, type: anyType },
      ],
      primitiveType("bool")
    ),
  });

  scope.defineVariable(ident("Core:and"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: primitiveType("bool") },
        { isOptional: false, type: primitiveType("bool") },
      ],
      primitiveType("bool")
    ),
  });

  scope.defineVariable(ident("Core:or"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: primitiveType("bool") },
        { isOptional: false, type: primitiveType("bool") },
      ],
      primitiveType("bool")
    ),
  });

  scope.defineVariable(ident("Core:add"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: primitiveType("num") },
        { isOptional: false, type: primitiveType("num") },
      ],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Core:sub"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: primitiveType("num") },
        { isOptional: false, type: primitiveType("num") },
      ],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Core:mul"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: primitiveType("num") },
        { isOptional: false, type: primitiveType("num") },
      ],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Core:div"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: primitiveType("num") },
        { isOptional: false, type: primitiveType("num") },
      ],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Core:pow"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: primitiveType("num") },
        { isOptional: false, type: primitiveType("num") },
      ],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Core:mod"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: primitiveType("num") },
        { isOptional: false, type: primitiveType("num") },
      ],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Core:gt"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: primitiveType("num") },
        { isOptional: false, type: primitiveType("num") },
      ],
      primitiveType("bool")
    ),
  });

  scope.defineVariable(ident("Core:lt"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: primitiveType("num") },
        { isOptional: false, type: primitiveType("num") },
      ],
      primitiveType("bool")
    ),
  });

  scope.defineVariable(ident("Core:gteq"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: primitiveType("num") },
        { isOptional: false, type: primitiveType("num") },
      ],
      primitiveType("bool")
    ),
  });

  scope.defineVariable(ident("Core:lteq"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: primitiveType("num") },
        { isOptional: false, type: primitiveType("num") },
      ],
      primitiveType("bool")
    ),
  });

  scope.defineVariable(ident("Core:type"), {
    isMut: false,
    type: fnType([{ isOptional: false, type: anyType }], primitiveType("str")),
  });

  scope.defineVariable(ident("Core:to_str"), {
    isMut: false,
    type: fnType([{ isOptional: false, type: anyType }], primitiveType("str")),
  });

  scope.defineVariable(ident("Core:range"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: primitiveType("num") },
        { isOptional: false, type: primitiveType("num") },
      ],
      arrayType(primitiveType("num"))
    ),
  });

  scope.defineVariable(ident("Core:sleep"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("null")
    ),
  });
}
