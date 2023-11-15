import { Position } from "vscode-languageserver";

import { SourceLocation } from "../parser/SourceRange.js";

export function aiLocation2LspPosition(location: SourceLocation): Position {
  return {
    character: location.column - 1,
    line: location.line - 1,
  };
}
