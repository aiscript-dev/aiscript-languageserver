import {
  AiAlreadyDeclaredVariableError,
  AiCanNotAssignToImmutableVariableError,
  AiCanNotCallError,
  AiInvalidArgumentError,
  AiMissingArgumentError,
  AiNotAssignableTypeError,
  AiTypeErrorKind,
} from "../../errors/AiTypeError.js";
import { TypeError } from "../../index.js";
import { I18nLocalizerResult, I18nMessage, I18nMessages } from "../core.js";
import { AiScriptI18nMessages } from "./index.js";

export const typeErrorMessage = {
  ja: {
    NotAssignableType(dest: string, value: string) {
      return `型\`${dest}\`に、\`${value}\`は代入できません。`;
    },
    AlreadyDeclaredVariable(name: string) {
      return `変数\`${name}\`はすでに定義されています。`;
    },
    CanNotCall(type: string) {
      return `型\`${type}\`は関数型ではありません。`;
    },
    InvalidArgumentError(pos: number, dest: string, but: string) {
      return `${pos}番目の引数には型\`${dest}\`が必要ですが、\`${but}\`が与えられました。`;
    },
    MissingArgumentError(pos: number, dest: string) {
      return `${pos}番目の引数には型\`${dest}\`が必要ですが、何も与えられていません。`;
    },
    CanNotAssignToImmutableVariable(name: string) {
      return `変数\`${name}\`は不変なので、新たに代入することはできません。`;
    },
  } satisfies I18nMessage<keyof typeof AiTypeErrorKind>,
} satisfies I18nMessages;

export const typeErrorLocalizer = (
  error: TypeError
): I18nLocalizerResult<AiScriptI18nMessages> => {
  if (error instanceof AiNotAssignableTypeError) {
    return ["typing.NotAssignableType", [error.left, error.right]];
  } else if (error instanceof AiAlreadyDeclaredVariableError) {
    return ["typing.AlreadyDeclaredVariable", [error.name]];
  } else if (error instanceof AiCanNotCallError) {
    return ["typing.CanNotCall", [error.type]];
  } else if (error instanceof AiInvalidArgumentError) {
    return [
      "typing.InvalidArgumentError",
      [error.pos, error.expectType, error.butType],
    ];
  } else if (error instanceof AiMissingArgumentError) {
    return ["typing.MissingArgumentError", [error.pos, error.expectType]];
  } else if (error instanceof AiCanNotAssignToImmutableVariableError) {
    return ["typing.CanNotAssignToImmutableVariable", [error.name]];
  }

  switch (error.kind) {
    case AiTypeErrorKind.AlreadyDeclaredVariable:
      return ["typing.AlreadyDeclaredVariable", ["<:unknown:>"]];

    case AiTypeErrorKind.NotAssignableType:
      return ["typing.NotAssignableType", ["<:unknown:>", "<:unknown:>"]];

    case AiTypeErrorKind.CanNotCall:
      return ["typing.CanNotCall", ["<:unknown:>"]];

    case AiTypeErrorKind.InvalidArgumentError:
      return [
        "typing.InvalidArgumentError",
        [-1, "<:unknown:>", "<:unknown:>"],
      ];

    case AiTypeErrorKind.MissingArgumentError:
      return ["typing.MissingArgumentError", [-1, "<:unknown:>"]];

    case AiTypeErrorKind.CanNotAssignToImmutableVariable:
      return ["typing.CanNotAssignToImmutableVariable", ["<:unknown:>"]];
  }
};
