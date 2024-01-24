import { Scope } from "../Scope.js";
import { fnType, ident, primitiveType, union } from "../TypeValue.js";

export function installMathTypes(scope: Scope) {
  scope.defineVariable(ident("Math:Infinity"), {
    isMut: false,
    type: primitiveType("num"),
  });

  scope.defineVariable(ident("Math:E"), {
    isMut: false,
    type: primitiveType("num"),
  });

  scope.defineVariable(ident("Math:LN2"), {
    isMut: false,
    type: primitiveType("num"),
  });

  scope.defineVariable(ident("Math:LN10"), {
    isMut: false,
    type: primitiveType("num"),
  });

  scope.defineVariable(ident("Math:LOG2E"), {
    isMut: false,
    type: primitiveType("num"),
  });

  scope.defineVariable(ident("Math:LOG10E"), {
    isMut: false,
    type: primitiveType("num"),
  });

  scope.defineVariable(ident("Math:PI"), {
    isMut: false,
    type: primitiveType("num"),
  });

  scope.defineVariable(ident("Math:SQRT1_2"), {
    isMut: false,
    type: primitiveType("num"),
  });

  scope.defineVariable(ident("Math:SQRT2"), {
    isMut: false,
    type: primitiveType("num"),
  });

  scope.defineVariable(ident("Math:abs"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:acos"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:acosh"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:asin"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:asinh"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:atan"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:atanh"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:atan2"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: primitiveType("num") },
        { isOptional: false, type: primitiveType("num") },
      ],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:cbrt"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:ceil"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:clz32"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:cos"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:cosh"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:exp"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:expm1"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:floor"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:fround"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:hypot"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:imul"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:log"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: primitiveType("num") },
        { isOptional: false, type: primitiveType("num") },
      ],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:log1p"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:log10"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:log2"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:max"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: primitiveType("num") },
        { isOptional: false, type: primitiveType("num") },
      ],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:min"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: primitiveType("num") },
        { isOptional: false, type: primitiveType("num") },
      ],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:pow"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: false, type: primitiveType("num") },
        { isOptional: false, type: primitiveType("num") },
      ],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:round"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:sign"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:sin"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:sinh"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:sqrt"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:tan"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:tanh"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:trunc"), {
    isMut: false,
    type: fnType(
      [{ isOptional: false, type: primitiveType("num") }],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:rnd"), {
    isMut: false,
    type: fnType(
      [
        { isOptional: true, type: primitiveType("num") },
        { isOptional: true, type: primitiveType("num") },
      ],
      primitiveType("num")
    ),
  });

  scope.defineVariable(ident("Math:gen_rng"), {
    isMut: false,
    type: fnType(
      [
        {
          isOptional: false,
          type: union(primitiveType("num"), primitiveType("str")),
        },
      ],
      fnType(
        [
          { isOptional: true, type: primitiveType("num") },
          { isOptional: true, type: primitiveType("num") },
        ],
        primitiveType("num")
      )
    ),
  });
}
