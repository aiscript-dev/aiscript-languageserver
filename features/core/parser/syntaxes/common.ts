import { Token, TokenKind } from "@syuilo/aiscript/parser/token.js";
import { AiScriptSyntaxError } from "@syuilo/aiscript/error.js";
import { parseStatement } from "./statements.js";

import type { ITokenStream } from "@syuilo/aiscript/parser/streams/token-stream.js";
import type * as Ast from "@syuilo/aiscript/node.js";
import { ParserError } from "../../errors/index.js";
import {
  AiMissingBracketError,
  AiMissingKeywordError,
  AiSyntaxError,
  AiSyntaxErrorId,
} from "../../errors/AiSyntaxError.js";
import { NODE } from "../utils.js";

/**
 * ```abnf
 * Params = "(" [IDENT [":" Type] *(SEP IDENT [":" Type])] ")"
 * ```
 */
export function parseParams(
  s: ITokenStream,
  e: ParserError[]
): { name: string; argType?: Ast.TypeSource }[] | null {
  const items: { name: string; argType?: Ast.TypeSource }[] = [];

  if (s.token.kind != TokenKind.OpenParen) {
    return null;
  }

  s.next();

  if (s.kind === TokenKind.NewLine) {
    s.next();
  }

  while (s.kind !== TokenKind.CloseParen) {
    if (s.kind !== TokenKind.Identifier) {
      e.push(
        new AiSyntaxError(
          AiSyntaxErrorId.MissingIdentifier,
          s.token,
          s.token.loc
        )
      );
    }

    const name = s.token.value!;
    s.next();

    let type;
    if ((s.kind as TokenKind) === TokenKind.Colon) {
      s.next();
      type = parseType(s, e);
    }

    items.push({ name, argType: type ?? undefined });

    // separator
    switch (s.kind as TokenKind) {
      case TokenKind.NewLine: {
        s.next();
        break;
      }
      case TokenKind.Comma: {
        s.next();
        if (s.kind === TokenKind.NewLine) {
          s.next();
        }
        break;
      }
      case TokenKind.CloseParen: {
        break;
      }
      default: {
        throw new AiScriptSyntaxError("separator expected", s.token.loc);
      }
    }
  }

  if (s.kind !== TokenKind.CloseParen) {
    e.push(new AiMissingBracketError(")", s.token, s.token.loc));
  } else {
    s.next();
  }

  return items;
}

/**
 * ```abnf
 * Block = "{" *Statement "}"
 * ```
 */
export function parseBlock(
  s: ITokenStream,
  e: ParserError[]
): (Ast.Statement | Ast.Expression)[] | null {
  if (s.kind !== (TokenKind.OpenBrace as TokenKind)) return null;
  s.next();

  while (s.kind === TokenKind.NewLine) {
    s.next();
  }

  const steps: (Ast.Statement | Ast.Expression)[] = [];
  while (s.kind !== TokenKind.CloseBrace) {
    const stmt = parseStatement(s, e);
    if (stmt == null) {
      return null;
    }

    steps.push(stmt);

    // terminator
    switch (s.kind as TokenKind) {
      case TokenKind.NewLine:
      case TokenKind.SemiColon: {
        while ([TokenKind.NewLine, TokenKind.SemiColon].includes(s.kind)) {
          s.next();
        }
        break;
      }
      case TokenKind.CloseBrace: {
        break;
      }
      default: {
        throw new AiScriptSyntaxError(
          "Multiple statements cannot be placed on a single line.",
          s.token.loc
        );
      }
    }
  }

  if (s.kind !== TokenKind.CloseBrace) {
    e.push(new AiMissingBracketError("}", s.token, s.token.loc));
  } else {
    s.next();
  }

  return steps;
}

//#region Type

export function parseType(
  s: ITokenStream,
  e: ParserError[]
): Ast.TypeSource | null {
  if (s.kind === TokenKind.At) {
    return parseFnType(s, e);
  } else {
    return parseNamedType(s, e);
  }
}

/**
 * ```abnf
 * FnType = "@" "(" ParamTypes ")" "=>" Type
 * ParamTypes = [Type *(SEP Type)]
 * ```
 */
function parseFnType(s: ITokenStream, e: ParserError[]): Ast.TypeSource | null {
  const loc = s.token.loc;

  if (s.kind !== (TokenKind.At as TokenKind)) {
    return null;
  } else {
    s.next();
  }

  if (s.kind !== (TokenKind.OpenParen as TokenKind)) {
    e.push(new AiMissingBracketError("(", s.token, s.token.loc));
  } else {
    s.next();
  }

  const params: Ast.TypeSource[] = [];
  while (s.kind !== TokenKind.CloseParen) {
    if (params.length > 0) {
      switch (s.kind as TokenKind) {
        case TokenKind.Comma: {
          s.next();
          break;
        }
        default: {
          throw new AiScriptSyntaxError("separator expected", s.token.loc);
        }
      }
    }

    const type = parseType(s, e);

    if (type == null) {
      e.push(
        new AiSyntaxError(AiSyntaxErrorId.MissingType, s.token, s.token.loc)
      );
    } else {
      params.push(type);
    }
  }

  if (s.kind !== (TokenKind.CloseParen as TokenKind)) {
    e.push(new AiMissingBracketError(")", s.token, s.token.loc));
  } else {
    s.next();
  }

  if (s.kind !== (TokenKind.Arrow as TokenKind)) {
    e.push(new AiMissingKeywordError("=>", s.token, s.token.loc));
  } else {
    s.next();
  }

  let resultType = parseType(s, e);

  if (resultType == null) {
    e.push(
      new AiSyntaxError(AiSyntaxErrorId.MissingType, s.token, s.token.loc)
    );

    resultType = NODE(
      "namedTypeSource",
      { name: "any", inner: undefined },
      s.token.loc
    );
  }

  return NODE("fnTypeSource", { args: params, result: resultType! }, loc);
}

/**
 * ```abnf
 * NamedType = IDENT ["<" Type ">"]
 * ```
 */
function parseNamedType(
  s: ITokenStream,
  e: ParserError[]
): Ast.TypeSource | null {
  const loc = s.token.loc;

  if (s.kind !== TokenKind.Identifier) {
    return null;
  }

  const name = s.token.value!;
  s.next();

  // inner type
  let inner = null;

  if (s.kind === (TokenKind.Lt as TokenKind)) {
    s.next();
    inner = parseType(s, e);

    if (s.kind !== (TokenKind.Gt as TokenKind)) {
      e.push(new AiMissingBracketError(">", s.token, s.token.loc));
    } else {
      s.next();
    }
  }

  return NODE("namedTypeSource", { name, inner: inner ?? undefined }, loc);
}

//#endregion Type
