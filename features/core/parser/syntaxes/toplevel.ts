import { TokenKind } from "@syuilo/aiscript/parser/token.js";
import { AiScriptSyntaxError } from "@syuilo/aiscript/error.js";
import { parseDefStatement, parseStatement } from "./statements.js";
import { parseExpr } from "./expressions.js";

import type * as Ast from "@syuilo/aiscript/node.js";
import type { ITokenStream } from "@syuilo/aiscript/parser/streams/token-stream.js";
import { ParserError } from "../../errors/index.js";
import { AiSyntaxError, AiSyntaxErrorId } from "../../errors/AiSyntaxError.js";
import { NODE } from "../utils.js";

/**
 * ```abnf
 * TopLevel = *(Namespace / Meta / Statement)
 * ```
 */
export function parseTopLevel(s: ITokenStream, e: ParserError[]): Ast.Node[] {
  const nodes: Ast.Node[] = [];

  while (s.kind === TokenKind.NewLine) {
    s.next();
  }

  while (s.kind !== TokenKind.EOF) {
    switch (s.kind) {
      case TokenKind.Colon2: {
        const ns = parseNamespace(s, e);
        if (ns == null) {
          break;
        }

        nodes.push(ns);
        break;
      }
      case TokenKind.Sharp3: {
        nodes.push(parseMeta(s, e));
        break;
      }
      default: {
        const stmt = parseStatement(s, e);
        if (stmt == null) {
          break;
        }
        nodes.push(stmt);
        break;
      }
    }

    // terminator
    switch (s.kind as TokenKind) {
      case TokenKind.NewLine:
      case TokenKind.SemiColon: {
        while ([TokenKind.NewLine, TokenKind.SemiColon].includes(s.kind)) {
          s.next();
        }
        break;
      }
      case TokenKind.EOF: {
        break;
      }
      default: {
        throw new AiScriptSyntaxError(
          "Multiple statements cannot be placed on a single line.",
          s.token.loc,
        );
      }
    }
  }

  return nodes;
}

/**
 * ```abnf
 * Namespace = "::" IDENT "{" *(VarDef / FnDef / Namespace) "}"
 * ```
 */
export function parseNamespace(
  s: ITokenStream,
  e: ParserError[],
): Ast.Namespace | null {
  const loc = s.token.loc;

  s.nextWith(TokenKind.Colon2);

  s.expect(TokenKind.Identifier);
  const name = s.token.value!;
  s.next();

  const members: (Ast.Namespace | Ast.Definition)[] = [];
  s.nextWith(TokenKind.OpenBrace);

  while (s.kind === TokenKind.NewLine) {
    s.next();
  }

  while (s.kind !== TokenKind.CloseBrace) {
    switch (s.kind) {
      case TokenKind.VarKeyword:
      case TokenKind.LetKeyword:
      case TokenKind.At: {
        const stmt = parseDefStatement(s, e);
        if (stmt == null) {
          break;
        }
        members.push(stmt);
        break;
      }
      case TokenKind.Colon2: {
        const ns = parseNamespace(s, e);
        if (ns == null) {
          break;
        }
        members.push(ns);
        break;
      }
    }

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
        e.push(
          new AiSyntaxError(
            AiSyntaxErrorId.MultipleStatementsOnSingleLine,
            s.token,
            s.token.loc,
          ),
        );
        return null;
      }
    }
  }
  s.nextWith(TokenKind.CloseBrace);

  return NODE("ns", { name, members }, loc);
}

/**
 * ```abnf
 * Meta = "###" [IDENT] StaticExpr
 * ```
 */
export function parseMeta(s: ITokenStream, e: ParserError[]): Ast.Meta {
  const loc = s.token.loc;

  s.nextWith(TokenKind.Sharp3);

  let name = null;
  if (s.kind === TokenKind.Identifier) {
    name = s.token.value!;
    s.next();
  }

  const value = parseExpr(s, e, true);
  if (value == null) {
    e.push(
      new AiSyntaxError(AiSyntaxErrorId.MissingExpr, s.token, s.token.loc),
    );
  }

  return NODE(
    "meta",
    { name, value: value ?? NODE("null", {}, s.token.loc) },
    loc,
  );
}
