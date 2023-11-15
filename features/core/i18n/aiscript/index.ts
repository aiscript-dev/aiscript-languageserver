import { I18n } from "../core.js";
import { syntaxErrorMessage } from "./syntaxError.js";
import { typeErrorMessage } from "./typeError.js";

export const initAiScriptI18n = <L extends "ja">(lang: L) =>
  new I18n(lang, {
    syntax: syntaxErrorMessage,
    typing: typeErrorMessage,
  });

export type AiScriptI18n = ReturnType<typeof initAiScriptI18n>;

export type AiScriptI18nMessages = AiScriptI18n extends I18n<any, infer T>
  ? T
  : never;
