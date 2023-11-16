import { Ast } from "@syuilo/aiscript/index.js";

export type NodeParam<N extends Ast.Node> = {
  [K in Exclude<keyof N, "type" | "loc">]: N[K];
};

export function NODE<
  T extends Ast.Node["type"],
  N extends Ast.Node & { type: T }
>(type: T, params: NodeParam<N>, loc: { column: number; line: number }): N {
  return {
    type: type,
    ...params,
    loc,
  } as N;
}

export function CALL_NODE(
  name: string,
  args: Ast.Expression[],
  loc: { column: number; line: number }
) {
  return NODE(
    "call",
    {
      target: NODE("identifier", { name }, loc),
      args,
    },
    loc
  );
}
