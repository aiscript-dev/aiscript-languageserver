import { AiScriptSyntaxError } from "@syuilo/aiscript/error.js";
import { TokenStream } from "@syuilo/aiscript/parser/streams/token-stream.js";
import { Token, TokenKind } from "@syuilo/aiscript/parser/token.js";
import { parseBlock, parseParams, parseType } from "./common.js";
import { parseBlockOrStatement } from "./statements.js";

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

export function parseExpr(
  s: ITokenStream,
  e: ParserError[],
  isStatic: boolean
): Ast.Expression | null {
  if (isStatic) {
    return parseAtom(s, e, true);
  } else {
    return parsePratt(s, e, 0);
  }
}

// NOTE: infix(中置演算子)ではlbpを大きくすると右結合、rbpを大きくすると左結合の演算子になります。
// この値は演算子が左と右に対してどのくらい結合力があるかを表わしています。詳細はpratt parsingの説明ページを参照してください。

const operators: OpInfo[] = [
  { opKind: "postfix", kind: TokenKind.OpenParen, bp: 20 },
  { opKind: "postfix", kind: TokenKind.OpenBracket, bp: 20 },

  { opKind: "infix", kind: TokenKind.Dot, lbp: 18, rbp: 19 },

  { opKind: "infix", kind: TokenKind.Hat, lbp: 17, rbp: 16 },

  { opKind: "prefix", kind: TokenKind.Plus, bp: 14 },
  { opKind: "prefix", kind: TokenKind.Minus, bp: 14 },
  { opKind: "prefix", kind: TokenKind.Not, bp: 14 },

  { opKind: "infix", kind: TokenKind.Asterisk, lbp: 12, rbp: 13 },
  { opKind: "infix", kind: TokenKind.Slash, lbp: 12, rbp: 13 },
  { opKind: "infix", kind: TokenKind.Percent, lbp: 12, rbp: 13 },

  { opKind: "infix", kind: TokenKind.Plus, lbp: 10, rbp: 11 },
  { opKind: "infix", kind: TokenKind.Minus, lbp: 10, rbp: 11 },

  { opKind: "infix", kind: TokenKind.Lt, lbp: 8, rbp: 9 },
  { opKind: "infix", kind: TokenKind.LtEq, lbp: 8, rbp: 9 },
  { opKind: "infix", kind: TokenKind.Gt, lbp: 8, rbp: 9 },
  { opKind: "infix", kind: TokenKind.GtEq, lbp: 8, rbp: 9 },

  { opKind: "infix", kind: TokenKind.Eq2, lbp: 6, rbp: 7 },
  { opKind: "infix", kind: TokenKind.NotEq, lbp: 6, rbp: 7 },

  { opKind: "infix", kind: TokenKind.And2, lbp: 4, rbp: 5 },

  { opKind: "infix", kind: TokenKind.Or2, lbp: 2, rbp: 3 },
];

function parsePrefix(
  s: ITokenStream,
  e: ParserError[],
  minBp: number
): Ast.Expression | null {
  const loc = s.token.loc;
  const op = s.kind;
  s.next();

  // 改行のエスケープ
  if (s.kind === (TokenKind.BackSlash as TokenKind)) {
    s.next();

    if (s.kind !== (TokenKind.NewLine as TokenKind)) {
      return null;
    }

    s.next();
  }

  const expr = parsePratt(s, e, minBp);
  if (expr == null) return null;

  switch (op) {
    case TokenKind.Plus: {
      // 数値リテラル以外は非サポート
      if (expr.type === "num") {
        return NODE("num", { value: expr.value }, loc);
      } else {
        e.push(new AiSyntaxError(AiSyntaxErrorId.NonNumericSign, expr, loc));
      }
      // TODO: 将来的にサポートされる式を拡張
      // return NODE('plus', { expr }, loc);
    }
    case TokenKind.Minus: {
      // 数値リテラル以外は非サポート
      if (expr.type === "num") {
        return NODE("num", { value: -1 * expr.value }, loc);
      } else {
        e.push(new AiSyntaxError(AiSyntaxErrorId.NonNumericSign, expr, loc));
      }
      // TODO: 将来的にサポートされる式を拡張
      // return NODE('minus', { expr }, loc);
    }
    case TokenKind.Not: {
      return NODE("not", { expr }, loc);
    }
    default: {
      e.push(new AiSyntaxError(AiSyntaxErrorId.NonNumericSign, s.token, loc));
    }
  }

  return null;
}

function parseInfix(
  s: ITokenStream,
  e: ParserError[],
  left: Ast.Expression,
  minBp: number
): Ast.Expression | null {
  const loc = s.token.loc;
  const op = s.kind;
  s.next();

  // 改行のエスケープ
  if (s.kind === TokenKind.BackSlash) {
    s.next();

    if (s.kind !== (TokenKind.NewLine as TokenKind)) {
      return null;
    }

    s.next();
  }

  if (op === TokenKind.Dot) {
    let ident;

    if (s.kind !== (TokenKind.Identifier as TokenKind)) {
      e.push(
        new AiSyntaxError(AiSyntaxErrorId.MissingIdentifier, s.token, loc)
      );
    } else {
      ident = s.token;
      s.next();
    }

    const name = ident?.value ?? "";

    return NODE(
      "prop",
      {
        target: left,
        name,
      },
      loc
    );
  } else {
    let right: Ast.Expression;
    {
      const expr = parsePratt(s, e, minBp);
      if (expr == null) {
        e.push(
          new AiSyntaxError(
            AiSyntaxErrorId.UnExpectedToken,
            s.token,
            s.token.loc
          )
        );

        right = NODE("null", {}, s.token.loc);
      } else {
        right = expr;
      }
    }

    switch (op) {
      case TokenKind.Hat: {
        return CALL_NODE("Core:pow", [left, right], loc);
      }
      case TokenKind.Asterisk: {
        return CALL_NODE("Core:mul", [left, right], loc);
      }
      case TokenKind.Slash: {
        return CALL_NODE("Core:div", [left, right], loc);
      }
      case TokenKind.Percent: {
        return CALL_NODE("Core:mod", [left, right], loc);
      }
      case TokenKind.Plus: {
        return CALL_NODE("Core:add", [left, right], loc);
      }
      case TokenKind.Minus: {
        return CALL_NODE("Core:sub", [left, right], loc);
      }
      case TokenKind.Lt: {
        return CALL_NODE("Core:lt", [left, right], loc);
      }
      case TokenKind.LtEq: {
        return CALL_NODE("Core:lteq", [left, right], loc);
      }
      case TokenKind.Gt: {
        return CALL_NODE("Core:gt", [left, right], loc);
      }
      case TokenKind.GtEq: {
        return CALL_NODE("Core:gteq", [left, right], loc);
      }
      case TokenKind.Eq2: {
        return CALL_NODE("Core:eq", [left, right], loc);
      }
      case TokenKind.NotEq: {
        return CALL_NODE("Core:neq", [left, right], loc);
      }
      case TokenKind.And2: {
        return NODE("and", { left, right }, loc);
      }
      case TokenKind.Or2: {
        return NODE("or", { left, right }, loc);
      }
      default: {
        e.push(new AiSyntaxError(AiSyntaxErrorId.NonNumericSign, s.token, loc));
      }
    }
  }

  return null;
}

function parsePostfix(
  s: ITokenStream,
  e: ParserError[],
  expr: Ast.Expression
): Ast.Call | Ast.Index | null {
  const loc = s.token.loc;
  const op = s.kind;

  switch (op) {
    case TokenKind.OpenParen: {
      return parseCall(s, e, expr);
    }

    case TokenKind.OpenBracket: {
      const bracketLoc = s.token.loc;
      s.next();
      const index = parseExpr(s, e, false);
      if (index == null) {
        e.push(
          new AiSyntaxError(AiSyntaxErrorId.MissingExpr, s.token, bracketLoc)
        );
      }

      if (s.kind !== (TokenKind.CloseBracket as TokenKind)) {
        e.push(new AiSyntaxError(AiSyntaxErrorId.MissingBracket, s.token, loc));
      } else {
        s.next();
      }

      return NODE(
        "index",
        {
          target: expr,
          index: index ?? NODE("null", {}, bracketLoc),
        },
        loc
      );
    }

    default: {
      e.push(new AiSyntaxError(AiSyntaxErrorId.NonNumericSign, s.token, loc));

      return null;
    }
  }
}

function parseAtom(
  s: ITokenStream,
  e: ParserError[],
  isStatic: boolean
): Ast.Expression | null {
  const loc = s.token.loc;

  switch (s.kind) {
    case TokenKind.IfKeyword: {
      if (isStatic) break;
      return parseIf(s, e);
    }
    case TokenKind.At: {
      if (isStatic) break;
      return parseFnExpr(s, e);
    }
    case TokenKind.MatchKeyword: {
      if (isStatic) break;
      return parseMatch(s, e);
    }
    case TokenKind.EvalKeyword: {
      if (isStatic) break;
      return parseEval(s, e);
    }
    case TokenKind.ExistsKeyword: {
      if (isStatic) break;
      return parseExists(s, e);
    }
    case TokenKind.Template: {
      const values: (string | Ast.Expression)[] = [];

      if (isStatic) break;

      for (const element of s.token.children!) {
        switch (element.kind) {
          case TokenKind.TemplateStringElement: {
            values.push(NODE("str", { value: element.value! }, element.loc));
            break;
          }

          case TokenKind.TemplateExprElement: {
            // スキャナで埋め込み式として事前に読み取っておいたトークン列をパースする
            const exprStream = new TokenStream(element.children!);
            const expr = parseExpr(exprStream, e, false);
            if (expr == null || exprStream.kind !== TokenKind.EOF) {
              e.push(
                new AiSyntaxError(AiSyntaxErrorId.UnExpectedToken, s.token, loc)
              );
              break;
            }
            values.push(expr ?? NODE("null", {}, s.token.loc));
            break;
          }

          default: {
            e.push(
              new AiSyntaxError(AiSyntaxErrorId.UnExpectedToken, s.token, loc)
            );
            break;
          }
        }
      }

      s.next();
      return NODE("tmpl", { tmpl: values }, loc);
    }
    case TokenKind.StringLiteral: {
      const value = s.token.value!;
      s.next();
      return NODE("str", { value }, loc);
    }
    case TokenKind.NumberLiteral: {
      // TODO: validate number value
      const value = Number(s.token.value!);
      s.next();
      return NODE("num", { value }, loc);
    }
    case TokenKind.TrueKeyword:
    case TokenKind.FalseKeyword: {
      const value = s.kind === TokenKind.TrueKeyword;
      s.next();
      return NODE("bool", { value }, loc);
    }
    case TokenKind.NullKeyword: {
      s.next();
      return NODE("null", {}, loc);
    }
    case TokenKind.OpenBrace: {
      return parseObject(s, e, isStatic);
    }
    case TokenKind.OpenBracket: {
      return parseArray(s, e, isStatic);
    }
    case TokenKind.Identifier: {
      if (isStatic) break;
      return parseReference(s, e) ?? NODE("null", {}, s.token.loc);
    }
    case TokenKind.OpenParen: {
      s.next();

      const expr = parseExpr(s, e, isStatic);

      if (s.kind !== (TokenKind.CloseParen as TokenKind)) {
        e.push(new AiMissingBracketError(")", s.token, s.token.loc));
      }

      s.next();

      return expr;
    }
  }

  return null;
}

/**
 * Call = "(" [Expr *(SEP Expr) [SEP]] ")"
 */
function parseCall(
  s: ITokenStream,
  e: ParserError[],
  target: Ast.Expression
): Ast.Call | null {
  const loc = s.token.loc;
  const items: Ast.Expression[] = [];

  if (s.kind !== (TokenKind.OpenParen as TokenKind)) {
    return null;
  }

  s.next();

  if (s.kind === (TokenKind.NewLine as TokenKind)) {
    s.next();
  }

  while (s.kind !== TokenKind.CloseParen) {
    items.push(parseExpr(s, e, false) ?? NODE("null", {}, s.token.loc));

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
        e.push(
          new AiSyntaxError(
            AiSyntaxErrorId.SeparatorExpected,
            s.token,
            s.token.loc
          )
        );
        s.next();
        break;
      }
    }
  }

  if (s.kind !== (TokenKind.CloseParen as TokenKind)) {
    e.push(new AiMissingBracketError(")", s.token, s.token.loc));
  } else {
    s.next();
  }

  return NODE(
    "call",
    {
      target,
      args: items,
    },
    loc
  );
}

/**
 * ```abnf
 * If = "if" Expr BlockOrStatement *("elif" Expr BlockOrStatement) ["else" BlockOrStatement]
 * ```
 */
function parseIf(s: ITokenStream, e: ParserError[]): Ast.If | null {
  const loc = s.token.loc;

  if (s.kind !== (TokenKind.IfKeyword as TokenKind)) {
    return null;
  }

  s.next();

  let cond = parseExpr(s, e, false);
  let then = parseBlockOrStatement(s, e);
  if (cond == null) {
    e.push(new AiSyntaxError(AiSyntaxErrorId.MissingCondition, s.token, loc));
  }

  if (then == null) {
    e.push(new AiSyntaxError(AiSyntaxErrorId.MissingThenClause, s.token, loc));
  }

  if (
    s.kind === TokenKind.NewLine &&
    [TokenKind.ElifKeyword, TokenKind.ElseKeyword].includes(s.lookahead(1).kind)
  ) {
    s.next();
  }

  const elseif: {
    cond: Ast.Expression;
    then: Ast.Statement | Ast.Expression;
  }[] = [];
  while (s.kind === TokenKind.ElifKeyword) {
    s.next();
    const elifCond = parseExpr(s, e, false) ?? NODE("null", {}, s.token.loc);
    const elifThen = parseBlockOrStatement(s, e);
    if (
      (s.kind as TokenKind) === TokenKind.NewLine &&
      [TokenKind.ElifKeyword, TokenKind.ElseKeyword].includes(
        s.lookahead(1).kind
      )
    ) {
      s.next();
    }

    elseif.push({
      cond: elifCond,
      then: elifThen ?? NODE("block", { statements: [] }, elifCond.loc),
    });
  }

  let _else = undefined;
  if (s.kind === TokenKind.ElseKeyword) {
    s.next();
    _else = parseBlockOrStatement(s, e);
    if (_else == null) {
      e.push(
        new AiSyntaxError(AiSyntaxErrorId.MissingBody, s.token, s.token.loc)
      );
    }
  }

  return NODE(
    "if",
    {
      cond: cond ?? NODE("null", {}, s.token.loc),
      then: then ?? NODE("block", { statements: [] }, s.token.loc),
      elseif,
      else: _else ?? undefined,
    },
    loc
  );
}

/**
 * ```abnf
 * FnExpr = "@" Params [":" Type] Block
 * ```
 */
function parseFnExpr(s: ITokenStream, e: ParserError[]): Ast.Fn | null {
  const loc = s.token.loc;

  if (s.kind !== (TokenKind.At as TokenKind)) {
    return null;
  }

  s.next();

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
    if (type == null) {
      e.push(
        new AiSyntaxError(AiSyntaxErrorId.MissingType, s.token, s.token.loc)
      );
    }
  }

  const body = parseBlock(s, e);
  if (body == null) {
    e.push(
      new AiSyntaxError(AiSyntaxErrorId.MissingBody, s.token, s.token.loc)
    );
  }

  return NODE(
    "fn",
    { args: params ?? [], retType: type ?? undefined, children: body ?? [] },
    loc
  );
}

/**
 * ```abnf
 * Match = "match" Expr "{" [MatchCases] ["default" "=>" BlockOrStatement [SEP]] "}"
 * MatchCases = "case" Expr "=>" BlockOrStatement *(SEP "case" Expr "=>" BlockOrStatement) [SEP]
 * ```
 */
function parseMatch(s: ITokenStream, e: ParserError[]): Ast.Match | null {
  const loc = s.token.loc;

  if (s.kind !== (TokenKind.MatchKeyword as TokenKind)) {
    return null;
  }

  let about = parseExpr(s, e, false);
  if (about === null) {
    e.push(new AiSyntaxError(AiSyntaxErrorId.MissingExpr, s.token, loc));
  }

  if (s.kind !== (TokenKind.OpenBrace as TokenKind)) {
    e.push(new AiMissingBracketError("{", s.token, loc));
  } else {
    s.next();
  }

  if (s.kind === TokenKind.NewLine) {
    s.next();
  }

  const qs: { q: Ast.Expression; a: Ast.Statement | Ast.Expression }[] = [];
  while (
    s.kind !== TokenKind.DefaultKeyword &&
    s.kind !== TokenKind.CloseBrace
  ) {
    if (s.kind !== TokenKind.CaseKeyword) {
      e.push(new AiMissingKeywordError("case", s.token, s.token.loc));
    } else {
      s.next();
    }

    const q = parseExpr(s, e, false) ?? NODE("null", {}, s.token.loc);

    if (s.kind !== TokenKind.Arrow) {
      e.push(new AiMissingKeywordError("=>", s.token, s.token.loc));
    } else {
      s.next();
    }

    const a =
      parseBlockOrStatement(s, e) ?? NODE("block", { statements: [] }, q.loc);
    qs.push({ q, a: a });

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
      case TokenKind.DefaultKeyword:
      case TokenKind.CloseBrace: {
        break;
      }
      default: {
        e.push(
          new AiSyntaxError(
            AiSyntaxErrorId.SeparatorExpected,
            s.token,
            s.token.loc
          )
        );
      }
    }
  }

  let x;
  if (s.kind === (TokenKind.DefaultKeyword as TokenKind)) {
    s.next();

    if (s.kind !== (TokenKind.Arrow as TokenKind)) {
      e.push(new AiMissingKeywordError("=>", s.token, s.token.loc));
    } else {
      s.next();
    }

    x = parseBlockOrStatement(s, e);

    // separator
    switch (s.kind as TokenKind) {
      case TokenKind.NewLine: {
        s.next();
        break;
      }
      case TokenKind.Comma: {
        s.next();
        if ((s.kind as TokenKind) === TokenKind.NewLine) {
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
            AiSyntaxErrorId.SeparatorExpected,
            s.token,
            s.token.loc
          )
        );
      }
    }
  }

  if (s.kind !== TokenKind.CloseBrace) {
    e.push(new AiMissingBracketError("}", s.token, s.token.loc));
  } else {
    s.next();
  }

  return NODE(
    "match",
    {
      about: about ?? NODE("null", {}, loc),
      qs,
      default: x ?? undefined,
    },
    loc
  );
}

/**
 * ```abnf
 * Eval = "eval" Block
 * ```
 */
function parseEval(s: ITokenStream, e: ParserError[]): Ast.Block | null {
  const loc = s.token.loc;

  if (s.kind !== TokenKind.EvalKeyword) {
    return null;
  }

  s.next();

  const statements = parseBlock(s, e);
  if (statements == null) {
    e.push(new AiSyntaxError(AiSyntaxErrorId.MissingBody, s.token, loc));
  }

  return NODE("block", { statements: statements ?? [] }, loc);
}

/**
 * ```abnf
 * Exists = "exists" Reference
 * ```
 */
function parseExists(s: ITokenStream, e: ParserError[]): Ast.Exists | null {
  const loc = s.token.loc;

  if (s.kind !== TokenKind.ExistsKeyword) {
    return null;
  }

  const identifier = parseReference(s, e);
  if (identifier == null) {
    e.push(new AiSyntaxError(AiSyntaxErrorId.MissingIdentifier, s.token, loc));
  }

  return NODE(
    "exists",
    {
      identifier: identifier ?? NODE("identifier", { name: "" }, loc),
    },
    loc
  );
}

/**
 * ```abnf
 * Reference = IDENT *(":" IDENT)
 * ```
 */
function parseReference(
  s: ITokenStream,
  e: ParserError[]
): Ast.Identifier | null {
  const loc = s.token.loc;

  const segs: string[] = [];
  while (true) {
    if (segs.length > 0) {
      if (s.kind === TokenKind.Colon) {
        if (s.token.hasLeftSpacing) {
          e.push(
            new AiSyntaxError(
              AiSyntaxErrorId.CanNotUseSpacesInReference,
              s.token,
              s.token.loc
            )
          );
        }
        s.next();
        if (s.token.hasLeftSpacing) {
          e.push(
            new AiSyntaxError(
              AiSyntaxErrorId.CanNotUseSpacesInReference,
              s.token,
              s.token.loc
            )
          );
        }
      } else {
        break;
      }
    }

    if (s.kind !== TokenKind.Identifier) {
      return null;
    }

    segs.push(s.token.value!);
    s.next();
  }
  return NODE("identifier", { name: segs.join(":") }, loc);
}

/**
 * ```abnf
 * Object = "{" [IDENT ":" Expr *(SEP IDENT ":" Expr) [SEP]] "}"
 * ```
 */
function parseObject(
  s: ITokenStream,
  e: ParserError[],
  isStatic: boolean
): Ast.Obj | null {
  const loc = s.token.loc;

  if (s.kind !== (TokenKind.OpenBrace as TokenKind)) {
    return null;
  }

  s.next();

  if (s.kind === (TokenKind.NewLine as TokenKind)) {
    s.next();
  }

  const map = new Map<string, Ast.Expression>();
  while (s.kind !== (TokenKind.CloseBrace as TokenKind)) {
    let k: string;

    if (s.kind !== (TokenKind.Identifier as TokenKind)) {
      e.push(
        new AiSyntaxError(
          AiSyntaxErrorId.MissingIdentifier,
          s.token,
          s.token.loc
        )
      );

      k = "";
    } else {
      k = s.token.value!;
      s.next();
    }

    if (s.kind !== (TokenKind.Colon as TokenKind)) {
      e.push(
        new AiSyntaxError(
          AiSyntaxErrorId.SeparatorExpected,
          s.token,
          s.token.loc
        )
      );
    } else {
      s.next();
    }

    const v = parseExpr(s, e, isStatic);
    if (v == null) {
      e.push(
        new AiSyntaxError(AiSyntaxErrorId.MissingExpr, s.token, s.token.loc)
      );
    } else {
      map.set(k, v);
    }

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
      case TokenKind.CloseBrace: {
        break;
      }
      default: {
        e.push(
          new AiSyntaxError(
            AiSyntaxErrorId.SeparatorExpected,
            s.token,
            s.token.loc
          )
        );
      }
    }
  }

  if (s.kind !== TokenKind.CloseBrace) {
    e.push(new AiMissingBracketError("}", s.token, s.token.loc));
  } else {
    s.next();
  }

  return NODE("obj", { value: map }, loc);
}

/**
 * ```abnf
 * Array = "[" [Expr *(SEP Expr) [SEP]] "]"
 * ```
 */
function parseArray(
  s: ITokenStream,
  e: ParserError[],
  isStatic: boolean
): Ast.Arr | null {
  const loc = s.token.loc;

  if (s.kind !== (TokenKind.OpenBracket as TokenKind)) {
    return null;
  }

  s.next();

  if (s.kind === (TokenKind.NewLine as TokenKind)) {
    s.next();
  }

  const value: Ast.Expression[] = [];
  while (s.kind !== (TokenKind.CloseBracket as TokenKind)) {
    const expr = parseExpr(s, e, isStatic);
    if (expr == null) {
      e.push(
        new AiSyntaxError(AiSyntaxErrorId.MissingExpr, s.token, s.token.loc)
      );
    }

    value.push(expr ?? NODE("null", {}, s.token.loc));

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
      case TokenKind.CloseBracket: {
        break;
      }
      default: {
        e.push(
          new AiSyntaxError(
            AiSyntaxErrorId.SeparatorExpected,
            s.token,
            s.token.loc
          )
        );
      }
    }
  }

  if (s.kind !== TokenKind.CloseBracket) {
    e.push(new AiMissingBracketError("]", s.token, s.token.loc));
  } else {
    s.next();
  }

  return NODE("arr", { value: value ?? [] }, loc);
}

//#region Pratt parsing

type PrefixInfo = { opKind: "prefix"; kind: TokenKind; bp: number };
type InfixInfo = { opKind: "infix"; kind: TokenKind; lbp: number; rbp: number };
type PostfixInfo = { opKind: "postfix"; kind: TokenKind; bp: number };
type OpInfo = PrefixInfo | InfixInfo | PostfixInfo;

function parsePratt(
  s: ITokenStream,
  e: ParserError[],
  minBp: number
): Ast.Expression | null {
  // pratt parsing
  // https://matklad.github.io/2020/04/13/simple-but-powerful-pratt-parsing.html

  let left: Ast.Expression;

  const tokenKind = s.kind;
  const prefix = operators.find(
    (x): x is PrefixInfo => x.opKind === "prefix" && x.kind === tokenKind
  );
  if (prefix != null) {
    const expr = parsePrefix(s, e, prefix.bp);
    if (expr == null) return null;

    left = expr;
  } else {
    const expr = parseAtom(s, e, false);
    if (expr == null) return null;

    left = expr;
  }

  while (true) {
    // 改行のエスケープ
    if (s.kind === (TokenKind.BackSlash as TokenKind)) {
      s.next();

      if (s.kind !== (TokenKind.NewLine as TokenKind)) {
        e.push(
          new AiSyntaxError(
            AiSyntaxErrorId.MissingLineBreak,
            s.token,
            s.token.loc
          )
        );
      } else {
        break;
      }
    }

    const tokenKind = s.kind;

    const postfix = operators.find(
      (x): x is PostfixInfo => x.opKind === "postfix" && x.kind === tokenKind
    );
    if (postfix != null) {
      if (postfix.bp < minBp) {
        break;
      }

      if (
        [TokenKind.OpenBracket, TokenKind.OpenParen].includes(tokenKind) &&
        s.token.hasLeftSpacing
      ) {
        // 前にスペースがある場合は後置演算子として処理しない
      } else {
        const expr = parsePostfix(s, e, left);
        if (expr == null) {
          e.push(
            new AiSyntaxError(AiSyntaxErrorId.MissingExpr, s.token, s.token.loc)
          );
        }
        left = expr ?? NODE("null", {}, s.token.loc);
        continue;
      }
    }

    const infix = operators.find(
      (x): x is InfixInfo => x.opKind === "infix" && x.kind === tokenKind
    );
    if (infix != null) {
      if (infix.lbp < minBp) {
        break;
      }

      const expr = parseInfix(s, e, left, infix.rbp);
      if (expr == null) {
        e.push(
          new AiSyntaxError(AiSyntaxErrorId.MissingExpr, s.token, s.token.loc)
        );
      }
      left = expr ?? NODE("null", {}, s.token.loc);
      continue;
    }

    break;
  }

  return left;
}

//#endregion Pratt parsing
