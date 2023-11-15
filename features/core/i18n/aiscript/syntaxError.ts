import {
  AiMissingBracketError,
  AiMissingKeywordError,
  AiSyntaxErrorId,
} from "../../errors/AiSyntaxError.js";
import { ParserError } from "../../errors/index.js";
import { Enum2Name } from "../../utils/type.js";
import {
  I18n,
  I18nLangs,
  I18nLocalizerResult,
  I18nMessage,
  I18nMessages,
  I18nPath,
} from "../core.js";
import { AiScriptI18nMessages } from "./index.js";

export const syntaxErrorMessage = {
  ja: {
    invalidAttribute() {
      return "不正なAttributeです。";
    },
    UnExpectedToken() {
      return `予期しないトークンが現れました。`;
    },
    MultipleStatementsOnSingleLine() {
      return "複数のステートメントは同じ行に置くことはできません。";
    },
    MissingThenClause() {
      return "if文にはthen節が必要です。";
    },
    MissingCondition() {
      return "if文には条件が必要です。";
    },
    SeparatorExpected() {
      return "セパレーターが必要です。";
    },
    NonNumericSign() {
      return "数値以外にはこの演算子は使えません。";
    },
    CanNotUseSpacesInReference() {
      return "識別子に空白は使用できません。";
    },
    MissingIdentifier() {
      return "識別子が必要です。";
    },
    MissingType() {
      return "型が必要です。";
    },
    MissingParams() {
      return "引数部分が必要です。";
    },
    MissingFunctionBody() {
      return "関数には内容が必要です。";
    },
    MissingExpr() {
      return "式が必要です。";
    },
    MissingKeyword(name: string) {
      return `\`${name}\`キーワードが必要です。`;
    },
    MissingBody() {
      return `コードブロックが必要です。`;
    },
    MissingBracket(bracket: string) {
      return `\`${bracket}\`が必要です。`;
    },
    MissingAttribute() {
      return "Attributeが必要です。";
    },
    MissingLineBreak() {
      return "改行が必要です。";
    },
    MissingStatement() {
      return "ステートメントが必要です。";
    },
  } satisfies I18nMessage<keyof typeof AiSyntaxErrorId>,
} satisfies I18nMessages;

export const parserErrorLocalizer = (
  err: ParserError
): I18nLocalizerResult<AiScriptI18nMessages> => {
  if (err instanceof AiMissingBracketError) {
    return ["syntax.MissingBracket", [err.bracket]];
  } else if (err instanceof AiMissingKeywordError) {
    return ["syntax.MissingKeyword", [err.keyword]];
  }

  switch (err.messageId) {
    case AiSyntaxErrorId.MissingBracket: {
      return ["syntax.MissingBracket", ["<unknown>"]];
    }

    case AiSyntaxErrorId.MissingKeyword: {
      return ["syntax.MissingKeyword", ["<unknown>"]];
    }

    default: {
      const id = err.messageId as Exclude<
        typeof err.messageId,
        AiSyntaxErrorId.MissingBracket | AiSyntaxErrorId.MissingKeyword
      >;

      return [
        `syntax.${
          AiSyntaxErrorId[id] as Enum2Name<typeof AiSyntaxErrorId, typeof id>
        }`,
        [],
      ];
    }
  }
};
