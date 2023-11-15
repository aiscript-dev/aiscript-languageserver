import { TypeValue } from "./TypeValue.js";

export type Variable =
  | { isMut: true; type: TypeValue }
  | { isMut: false; readonly type: TypeValue };
