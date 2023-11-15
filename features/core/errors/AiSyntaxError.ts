import { Token } from "@syuilo/aiscript/parser/token.js";
import { SourceLocation } from "../parser/SourceRange.js";
import { Ast } from "@syuilo/aiscript";

export enum AiSyntaxErrorId {
  invalidAttribute,
  UnExpectedToken,
  MultipleStatementsOnSingleLine,
  MissingThenClause,
  MissingCondition,
  SeparatorExpected,
  NonNumericSign,
  CanNotUseSpacesInReference,
  MissingIdentifier,
  MissingType,
  MissingParams,
  MissingFunctionBody,
  MissingExpr,
  MissingKeyword,
  MissingBody,
  MissingBracket,
  MissingAttribute,
  MissingLineBreak,
  MissingStatement,
}

export class AiSyntaxError extends Error {
  constructor(
    public messageId: AiSyntaxErrorId,
    public token: Token | Ast.Node,
    public location: SourceLocation,
  ) {
    super(AiSyntaxErrorId[messageId]);
  }
}

export class AiMissingKeywordError extends AiSyntaxError {
  constructor(
    public keyword: string,
    token: Token | Ast.Node,
    location: SourceLocation,
  ) {
    super(AiSyntaxErrorId.MissingKeyword, token, location);
  }
}

export class AiMissingBracketError extends AiSyntaxError {
  constructor(
    public bracket: string,
    token: Token | Ast.Node,
    location: SourceLocation,
  ) {
    super(AiSyntaxErrorId.MissingBracket, token, location);
  }
}
