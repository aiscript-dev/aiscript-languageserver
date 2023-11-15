import { Ast } from "@syuilo/aiscript";
import { Scanner } from "@syuilo/aiscript/parser/scanner.js";
import { Token, TokenKind } from "@syuilo/aiscript/parser/token.js";
import { ParserError } from "../errors/index.js";
import { parseTopLevel } from "./syntaxes/toplevel.js";

export class Parser {
  constructor() {}

  parseFromString(text: string, errors: ParserError[]): Ast.Node[] {
    return parseTopLevel(new Scanner(text), errors);
  }

  parseFromScanner(scanner: Scanner, errors: ParserError[]): Ast.Node[] {
    return parseTopLevel(scanner, errors);
  }
}
