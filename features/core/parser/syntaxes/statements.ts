import { AiScriptSyntaxError } from "@syuilo/aiscript/error.js";
import { Token, TokenKind } from "@syuilo/aiscript/parser/token.js";
import { parseBlock, parseParams, parseType } from "./common.js";
import { parseExpr } from "./expressions.js";

import type * as Ast from "@syuilo/aiscript/node.js";
import type { ITokenStream } from "@syuilo/aiscript/parser/streams/token-stream.js";
import { ParserError } from "../../errors/index.js";
import {
  AiMissingBracketError,
  AiMissingKeywordError,
  AiSyntaxError,
  AiSyntaxErrorId,
} from "../../errors/AiSyntaxError.js";
import { CALL_NODE, NODE } from "../utils.js";

/**
 * ```abnf
 * Statement = VarDef / FnDef / Out / Return / Attr / Each / For / Loop
 *           / Break / Continue / Assign / Expr
 * ```
 */
export function parseStatement(
  s: ITokenStream,
  e: ParserError[]
): Ast.Statement | Ast.Expression | null {
  const loc = s.token.loc;

  switch (s.kind) {
    case TokenKind.VarKeyword:
    case TokenKind.LetKeyword: {
      return parseVarDef(s, e);
    }
    case TokenKind.At: {
      if (s.lookahead(1).kind === TokenKind.Identifier) {
        return parseFnDef(s, e);
      }
      break;
    }
    case TokenKind.Out: {
      return parseOut(s, e);
    }
    case TokenKind.ReturnKeyword: {
      return parseReturn(s, e);
    }
    case TokenKind.OpenSharpBracket: {
      return parseStatementWithAttr(s, e);
    }
    case TokenKind.EachKeyword: {
      return parseEach(s, e);
    }
    case TokenKind.ForKeyword: {
      return parseFor(s, e);
    }
    case TokenKind.LoopKeyword: {
      return parseLoop(s, e);
    }
    case TokenKind.BreakKeyword: {
      s.next();
      return NODE("break", {}, loc);
    }
    case TokenKind.ContinueKeyword: {
      s.next();
      return NODE("continue", {}, loc);
    }
  }
  const expr = parseExpr(s, e, false);
  if (expr == null) return null;
  const assign = tryParseAssign(s, e, expr);
  if (assign) {
    return assign;
  }
  return expr;
}

export function parseDefStatement(
  s: ITokenStream,
  e: ParserError[]
): Ast.Definition | null {
  switch (s.kind) {
    case TokenKind.VarKeyword:
    case TokenKind.LetKeyword: {
      return parseVarDef(s, e);
    }
    case TokenKind.At: {
      return parseFnDef(s, e);
    }
    default: {
      e.push(
        new AiSyntaxError(AiSyntaxErrorId.UnExpectedToken, s.token, s.token.loc)
      );

      return null;
    }
  }
}

/**
 * ```abnf
 * BlockOrStatement = Block / Statement
 * ```
 */
export function parseBlockOrStatement(
  s: ITokenStream,
  e: ParserError[]
): Ast.Statement | Ast.Expression | null {
  const loc = s.token.loc;

  if (s.kind === TokenKind.OpenBrace) {
    const statements = parseBlock(s, e);
    return NODE("block", { statements: statements ?? [] }, loc);
  } else {
    return parseStatement(s, e);
  }
}

/**
 * ```abnf
 * VarDef = ("let" / "var") IDENT [":" Type] "=" Expr
 * ```
 */
function parseVarDef(s: ITokenStream, e: ParserError[]): Ast.Definition | null {
  const loc = s.token.loc;

  let mut;
  switch (s.kind) {
    case TokenKind.LetKeyword: {
      mut = false;
      break;
    }
    case TokenKind.VarKeyword: {
      mut = true;
      break;
    }
    default: {
      e.push(
        new AiSyntaxError(AiSyntaxErrorId.UnExpectedToken, s.token, s.token.loc)
      );

      return null;
    }
  }
  s.next();

  let name: string;
  if (s.kind === (TokenKind.Identifier as TokenKind)) {
    name = s.token.value ?? "";

    s.next();
  } else {
    e.push(new AiSyntaxError(AiSyntaxErrorId.MissingIdentifier, s.token, loc));

    name = "";
  }

  let type: Ast.TypeSource | undefined;
  if ((s.kind as TokenKind) === TokenKind.Colon) {
    s.next();
    const tmp = parseType(s, e);
    if (tmp == null) {
      e.push(
        new AiSyntaxError(AiSyntaxErrorId.MissingType, s.token, s.token.loc)
      );

      type = undefined;
    } else {
      type = tmp;
    }
  }

  if (s.kind === (TokenKind.Eq as TokenKind)) {
    s.next();
  } else {
    e.push(new AiMissingKeywordError("=", s.token, s.token.loc));
  }

  if ((s.kind as TokenKind) === TokenKind.NewLine) {
    s.next();
  }

  const expr = parseExpr(s, e, false);
  if (expr == null) {
    e.push(
      new AiSyntaxError(AiSyntaxErrorId.MissingExpr, s.token, s.token.loc)
    );
  }

  return NODE(
    "def",
    {
      name,
      varType: type ?? undefined,
      expr: expr ?? NODE("null", {}, s.token.loc),
      mut,
      attr: [],
    },
    loc
  );
}

/**
 * ```abnf
 * FnDef = "@" IDENT Params [":" Type] Block
 * ```
 */
function parseFnDef(s: ITokenStream, e: ParserError[]): Ast.Definition | null {
  const loc = s.token.loc;

  if (s.kind !== (TokenKind.At as TokenKind)) {
    return null;
  }

  s.next();

  let name: string;
  if (s.kind === (TokenKind.Identifier as TokenKind)) {
    name = s.token.value!;

    s.next();
  } else {
    e.push(new AiSyntaxError(AiSyntaxErrorId.MissingIdentifier, s.token, loc));

    name = "";
  }

  const params = parseParams(s, e);
  if (params == null) {
    e.push(
      new AiSyntaxError(AiSyntaxErrorId.MissingParams, s.token, s.token.loc)
    );
  }

  let type;
  if ((s.kind as TokenKind) === TokenKind.Colon) {
    s.next();
    type = parseType(s, e);
  }

  const body = parseBlock(s, e);
  if (body == null) {
    e.push(
      new AiSyntaxError(
        AiSyntaxErrorId.MissingFunctionBody,
        s.token,
        s.token.loc
      )
    );
  }

  return NODE(
    "def",
    {
      name,
      varType: undefined,
      expr: NODE(
        "fn",
        {
          args: params ?? [],
          retType: type ?? undefined,
          children: body ?? [],
        },
        loc
      ),
      mut: false,
      attr: [],
    },
    loc
  );
}

/**
 * ```abnf
 * Out = "<:" Expr
 * ```
 */
function parseOut(s: ITokenStream, e: ParserError[]): Ast.Call | null {
  const loc = s.token.loc;

  if (s.kind !== TokenKind.Out) {
    return null;
  }

  s.next();

  const expr = parseExpr(s, e, false);
  if (expr == null) {
    e.push(
      new AiSyntaxError(AiSyntaxErrorId.MissingExpr, s.token, s.token.loc)
    );
  }
  return CALL_NODE("print", [expr ?? NODE("null", {}, s.token.loc)], loc);
}

/**
 * ```abnf
 * Each = "each" "let" IDENT ("," / SPACE) Expr BlockOrStatement
 *      / "each" "(" "let" IDENT ("," / SPACE) Expr ")" BlockOrStatement
 * ```
 */
function parseEach(s: ITokenStream, e: ParserError[]): Ast.Each | null {
  const loc = s.token.loc;
  let hasParen = false;

  if (s.kind !== (TokenKind.EachKeyword as TokenKind)) {
    return null;
  }

  s.next();

  if (s.kind === TokenKind.OpenParen) {
    hasParen = true;
    s.next();
  }

  if (s.kind === TokenKind.LetKeyword) {
    s.next();
  } else {
    e.push(new AiMissingKeywordError("let", s.token, s.token.loc));
  }

  let name;
  if (s.kind === TokenKind.Identifier) {
    name = s.token.value!;
    s.next();
  } else {
    name = null;
  }

  if (s.kind === TokenKind.Comma) {
    s.next();
  } else {
    e.push(
      new AiSyntaxError(AiSyntaxErrorId.SeparatorExpected, s.token, s.token.loc)
    );
  }

  const items = parseExpr(s, e, false);

  if (hasParen) {
    if (s.kind === TokenKind.CloseParen) {
      s.next();
    } else {
      e.push(new AiMissingBracketError(")", s.token, s.token.loc));

      return NODE(
        "each",
        {
          var: name ?? "",
          items: items ?? NODE("null", {}, s.token.loc),
          for: NODE("block", { statements: [] }, s.token.loc),
        },
        loc
      );
    }
  }

  const body = parseBlockOrStatement(s, e);

  return NODE(
    "each",
    {
      var: name ?? "",
      items: items ?? NODE("null", {}, s.token.loc),
      for: body ?? NODE("block", { statements: [] }, s.token.loc),
    },
    loc
  );
}

function parseFor(s: ITokenStream, e: ParserError[]): Ast.For | null {
  const loc = s.token.loc;
  let hasParen = false;

  if (s.kind !== (TokenKind.ForKeyword as TokenKind)) {
    return null;
  }

  s.next();

  if (s.kind === TokenKind.OpenParen) {
    hasParen = true;
    s.next();
  }

  if (s.kind === TokenKind.LetKeyword) {
    // range syntax
    s.next();

    const identLoc = s.token.loc;

    let name;

    if (s.kind !== (TokenKind.Identifier as TokenKind)) {
      e.push(
        new AiSyntaxError(
          AiSyntaxErrorId.MissingIdentifier,
          s.token,
          s.token.loc
        )
      );

      name = "";
    } else {
      name = s.token.value!;

      s.next();
    }

    let _from;
    if ((s.kind as TokenKind) === TokenKind.Eq) {
      s.next();
      _from = parseExpr(s, e, false);
      if (_from == null) {
        e.push(
          new AiSyntaxError(AiSyntaxErrorId.MissingExpr, s.token, identLoc)
        );

        _from = NODE("num", { value: 0 }, identLoc);
      }
    } else {
      _from = NODE("num", { value: 0 }, identLoc);
    }

    if ((s.kind as TokenKind) === TokenKind.Comma) {
      s.next();
    } else {
      e.push(
        new AiSyntaxError(
          AiSyntaxErrorId.SeparatorExpected,
          s.token,
          s.token.loc
        )
      );
    }

    const to = parseExpr(s, e, false);
    if (_from == null) {
      e.push(new AiSyntaxError(AiSyntaxErrorId.MissingExpr, s.token, identLoc));
    }

    if (hasParen) {
      if (s.kind !== (TokenKind.CloseParen as TokenKind)) {
        e.push(new AiMissingBracketError(")", s.token, s.token.loc));
      } else {
        s.next();
      }
    }

    const body = parseBlockOrStatement(s, e);
    if (body == null) {
      e.push(
        new AiSyntaxError(AiSyntaxErrorId.MissingBody, s.token, s.token.loc)
      );
    }

    return NODE(
      "for",
      {
        var: name,
        from: _from,
        to: to ?? NODE("num", { value: 0 }, s.token.loc),
        for: body ?? NODE("block", { statements: [] }, s.token.loc),
        times: undefined,
      },
      loc
    );
  } else {
    // times syntax

    const times = parseExpr(s, e, false);
    if (times == null) {
      e.push(
        new AiSyntaxError(AiSyntaxErrorId.MissingExpr, s.token, s.token.loc)
      );
    }

    if (hasParen) {
      if (s.kind !== (TokenKind.CloseParen as TokenKind)) {
        e.push(new AiMissingBracketError(")", s.token, s.token.loc));
      } else {
        s.next();
      }
    }

    const body = parseBlockOrStatement(s, e);
    if (body == null) {
      e.push(
        new AiSyntaxError(AiSyntaxErrorId.MissingBody, s.token, s.token.loc)
      );
    }

    return NODE(
      "for",
      {
        times: times ?? NODE("num", { value: 0 }, s.token.loc),
        for: body ?? NODE("block", { statements: [] }, s.token.loc),
        from: undefined,
        to: undefined,
        var: undefined,
      },
      loc
    );
  }
}

/**
 * ```abnf
 * Return = "return" Expr
 * ```
 */
function parseReturn(s: ITokenStream, e: ParserError[]): Ast.Return | null {
  const loc = s.token.loc;

  if (s.kind !== (TokenKind.ReturnKeyword as TokenKind)) {
    return null;
  }

  s.next();

  const expr = parseExpr(s, e, false);
  if (expr == null) {
    e.push(
      new AiSyntaxError(AiSyntaxErrorId.MissingExpr, s.token, s.token.loc)
    );
  }

  return NODE("return", { expr: expr ?? NODE("null", {}, s.token.loc) }, loc);
}

/**
 * ```abnf
 * StatementWithAttr = *Attr Statement
 * ```
 */
function parseStatementWithAttr(
  s: ITokenStream,
  e: ParserError[]
): Ast.Statement | null {
  const attrs: Ast.Attribute[] = [];
  while (s.kind === (TokenKind.OpenSharpBracket as TokenKind)) {
    const bracket = s.token;
    const attr = parseAttr(s, e);

    if (attr == null) {
      e.push(
        new AiSyntaxError(
          AiSyntaxErrorId.MissingAttribute,
          bracket,
          bracket.loc
        )
      );
      break;
    }

    attrs.push(attr);

    if (s.kind !== (TokenKind.NewLine as TokenKind)) {
      e.push(
        new AiSyntaxError(AiSyntaxErrorId.MissingLineBreak, s.token, attr.loc)
      );
    } else {
      s.next();
    }
  }

  const statement = parseStatement(s, e);
  if (statement == null) {
    e.push(
      new AiSyntaxError(AiSyntaxErrorId.MissingStatement, s.token, s.token.loc)
    );
  } else if (statement.type !== "def") {
    e.push(
      new AiSyntaxError(
        AiSyntaxErrorId.invalidAttribute,
        statement,
        statement.loc
      )
    );

    return null;
  } else if (statement.attr != null) {
    statement.attr.push(...attrs);
  } else {
    statement.attr = attrs;
  }

  return statement;
}

/**
 * ```abnf
 * Attr = "#[" IDENT [StaticExpr] "]"
 * ```
 */
function parseAttr(s: ITokenStream, e: ParserError[]): Ast.Attribute | null {
  const loc = s.token.loc;

  if (s.kind !== (TokenKind.OpenSharpBracket as TokenKind)) {
    return null;
  }

  s.next();

  let name: string;

  if (s.kind === TokenKind.Identifier) {
    name = s.token.value!;
    s.next();
  } else {
    name = "";
    e.push(
      new AiSyntaxError(AiSyntaxErrorId.MissingIdentifier, s.token, s.token.loc)
    );
  }

  let value: Ast.Expression;
  if (s.kind !== TokenKind.CloseBracket) {
    const expr = parseExpr(s, e, true);
    if (expr == null) {
      e.push(
        new AiSyntaxError(AiSyntaxErrorId.MissingExpr, s.token, s.token.loc)
      );

      value = NODE("bool", { value: true }, loc);
    } else {
      value = expr;
    }
  } else {
    value = NODE("bool", { value: true }, loc);
  }

  if (s.kind === TokenKind.CloseBracket) {
    s.next();
  } else {
    e.push(
      new AiSyntaxError(AiSyntaxErrorId.MissingBracket, s.token, s.token.loc)
    );
  }

  return NODE("attr", { name, value }, loc);
}

/**
 * ```abnf
 * Loop = "loop" Block
 * ```
 */
function parseLoop(s: ITokenStream, e: ParserError[]): Ast.Loop | null {
  const loc = s.token.loc;

  if (s.kind !== TokenKind.LoopKeyword) {
    return null;
  }

  s.next();

  const statements = parseBlock(s, e);
  if (statements == null) {
    e.push(new AiSyntaxError(AiSyntaxErrorId.MissingBody, s.token, loc));
  }

  return NODE("loop", { statements: statements ?? [] }, loc);
}

/**
 * ```abnf
 * Assign = Expr ("=" / "+=" / "-=") Expr
 * ```
 */
function tryParseAssign(
  s: ITokenStream,
  e: ParserError[],
  dest: Ast.Expression
): Ast.Assign | Ast.AddAssign | Ast.SubAssign | undefined {
  const loc = s.token.loc;

  // Assign
  switch (s.kind) {
    case TokenKind.Eq: {
      s.next();
      let expr = parseExpr(s, e, false);
      if (expr == null) {
        e.push(new AiSyntaxError(AiSyntaxErrorId.MissingExpr, s.token, loc));
        expr = NODE("identifier", { name: "" }, loc);
      }

      return NODE("assign", { dest, expr: expr! }, loc);
    }
    case TokenKind.PlusEq: {
      s.next();
      let expr = parseExpr(s, e, false);
      if (expr == null) {
        e.push(new AiSyntaxError(AiSyntaxErrorId.MissingExpr, s.token, loc));
        expr = NODE("identifier", { name: "" }, loc);
      }

      return NODE("addAssign", { dest, expr: expr! }, loc);
    }
    case TokenKind.MinusEq: {
      s.next();
      let expr = parseExpr(s, e, false);
      if (expr == null) {
        e.push(new AiSyntaxError(AiSyntaxErrorId.MissingExpr, s.token, loc));
        expr = NODE("identifier", { name: "" }, loc);
      }

      return NODE("subAssign", { dest, expr: expr! }, loc);
    }
    default: {
      return;
    }
  }
}
