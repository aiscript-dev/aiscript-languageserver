import { TypeChecker } from "../typing/TypeChecker.js";
import { TypeValue } from "../typing/TypeValue.js";

/**
 * 重複する型を配列から取り除く
 */
export function excludeDuplicatedType(
  types: Iterable<TypeValue>,
  typeChecker: TypeChecker
): TypeValue[] {
  const res: TypeValue[] = [];

  loop: for (const item of types) {
    for (let i = 0; i < res.length; i++) {
      const x = res[i];

      if (typeChecker.isAssignableType(item, x)) {
        res.splice(i--, 1);
        continue;
      } else if (typeChecker.isAssignableType(x, item)) {
        continue loop;
      }
    }

    res.push(item);
  }

  return res;
}
