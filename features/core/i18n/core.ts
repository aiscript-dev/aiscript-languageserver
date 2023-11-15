export type I18nTemplate<T extends any[]> = (...args: T) => string;

export type I18nMessage<T extends string> = {
  [N in T]: I18nTemplate<any[]>;
};

export interface I18nMessages {
  [lang: string]: Record<string, I18nTemplate<any[]>>;
}

export type I18nPath<
  Messages extends Record<string, I18nMessages>,
  Lang extends Extract<keyof Messages[keyof Messages], string>,
  N extends keyof Messages = keyof Messages
> = N extends infer N extends string
  ? `${N}.${Extract<keyof Messages[N][Lang], string>}`
  : never;

export type I18nTemplateFn<
  Path extends string,
  Lang extends string,
  Messages extends Record<string, I18nMessages>
> = Path extends `${infer N}.${infer K}` ? Messages[N][Lang][K] : never;

export type I18nLangs<Messages extends Record<string, I18nMessages>> = Extract<
  keyof Messages[keyof Messages],
  string
>;

export class I18n<
  DefaultLang extends I18nLangs<Messages>,
  Messages extends Record<string, I18nMessages>
> {
  constructor(private defaultLang: DefaultLang, private messages: Messages) {}

  localize<T, F extends I18nLocalizer<T, Messages>>(localizer: F, value: T) {
    const res = localizer(value);

    return this.get(res[0] as I18nPath<Messages, DefaultLang>, res[1]);
  }

  get<P extends I18nPath<Messages, DefaultLang>>(
    path: P,
    args: Parameters<I18nTemplateFn<P, DefaultLang, Messages>>
  ): string;

  get<P extends I18nPath<Messages, L>, L extends I18nLangs<Messages>>(
    path: P,
    args: Parameters<I18nTemplateFn<P, L, Messages>>,
    lang: L
  ): string;

  get<P extends I18nPath<Messages, L>, L extends I18nLangs<Messages>>(
    path: P,
    args: Parameters<I18nTemplateFn<P, L, Messages>>,
    lang = this.defaultLang as unknown as L
  ): string {
    const [name, key] = path.split(".", 2);
    return (
      this.messages[name]?.[lang]?.[key]?.(...args) ?? `<${lang}: ${path}>`
    );
  }
}

export type I18nLocalizer<T, M extends Record<string, I18nMessages>> = (
  value: T
) => I18nLocalizerResult<M>;

export type I18nLocalizerResult<M extends Record<string, I18nMessages>> =
  _I18nLocalizerResult<M, I18nPath<M, I18nLangs<M>>>;

type _I18nLocalizerResult<
  M extends Record<string, I18nMessages>,
  P extends I18nPath<M, I18nLangs<M>>
> = P extends infer P extends string
  ? [path: P, args: Parameters<I18nTemplateFn<P, I18nLangs<M>, M>>]
  : never;

type _ = I18nLocalizerResult<{
  hoge: { ja: { pyio: () => "fuga" } };
  fuga: { ja: { hoge: () => "fuga" } };
}>;
