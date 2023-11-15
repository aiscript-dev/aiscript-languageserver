import {
  AiMissingBracketError,
  AiMissingKeywordError,
  AiSyntaxError,
} from "./AiSyntaxError.js";
import {
  AiAlreadyDeclaredVariableError,
  AiTypeError,
  AiNotAssignableTypeError,
  AiCanNotCallError,
  AiMissingArgumentError,
  AiInvalidArgumentError,
  AiCanNotAssignToImmutableVariableError,
} from "./AiTypeError.js";

export type ParserError =
  | AiSyntaxError
  | AiMissingKeywordError
  | AiMissingBracketError;

export type TypeError =
  | AiTypeError
  | AiAlreadyDeclaredVariableError
  | AiNotAssignableTypeError
  | AiCanNotCallError
  | AiMissingArgumentError
  | AiInvalidArgumentError
  | AiCanNotAssignToImmutableVariableError;
