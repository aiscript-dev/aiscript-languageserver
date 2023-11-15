export type Enum2Name<E, T, U extends keyof E = keyof E> = U extends
  infer K extends keyof E ? T extends (E)[K] ? K
  : never
  : never;
