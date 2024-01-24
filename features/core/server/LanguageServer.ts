import {
  Connection,
  Diagnostic,
  DiagnosticSeverity,
  InitializeResult,
  TextDocumentChangeEvent,
  TextDocuments,
  TextDocumentSyncKind,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";

import { Parser } from "../parser/index.js";
import { ParserError, TypeError } from "../errors/index.js";
import { AiScriptI18n } from "../i18n/aiscript/index.js";
import { parserErrorLocalizer } from "../i18n/aiscript/syntaxError.js";
import { aiLocation2LspPosition } from "./location.js";
import { TypeChecker } from "../typing/TypeChecker.js";
import { typeErrorLocalizer } from "../i18n/aiscript/typeError.js";
import { AiScriptError } from "@syuilo/aiscript/error.js";
import { SourceLocation } from "../parser/SourceRange.js";
import { createGlobalScope } from "../typing/Scope.js";

export * as Lsp from "vscode-languageserver";
export * as TextDocument from "vscode-languageserver-textdocument";

export class LanguageServer {
  private documents = new TextDocuments(TextDocument);

  constructor(
    private i18n: AiScriptI18n,
    private conn: Connection,
    private parser = new Parser(),
    private typeChecker = new TypeChecker(createGlobalScope())
  ) {
    conn.console.log("language server started");

    conn.onInitialize((): InitializeResult => {
      conn.console.log("initialize");

      return {
        capabilities: {
          textDocumentSync: TextDocumentSyncKind.Incremental,
        },
      };
    });

    this.documents.onDidChangeContent((change) => {
      this.onDidChangeContent(change);
    });
  }

  listen() {
    this.documents.listen(this.conn);

    this.conn.listen();
  }

  onDidChangeContent(change: TextDocumentChangeEvent<TextDocument>) {
    const text = change.document.getText();
    const parserErrors: ParserError[] = [];
    const typeErrors: TypeError[] = [];
    const diagnostics: Diagnostic[] = [];

    this.conn.console.log("did change content - " + change.document.uri);

    try {
      this.conn.console.log("start parse");
      const ast = this.parser.parseFromString(text, parserErrors);
      this.conn.console.log("end parse");
      for (const error of parserErrors) {
        const message = this.i18n.localize(parserErrorLocalizer, error);

        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          message,
          range: {
            start: aiLocation2LspPosition(error.location),
            end: aiLocation2LspPosition(error.location),
          },
          source: "aiscript-parser",
        });
      }

      const scope = this.typeChecker.globalScope.copy();
      this.conn.console.log("start type check");
      this.typeChecker.preRunBlock(ast, scope, typeErrors);
      this.typeChecker.runBlock(ast, scope, typeErrors);
      this.conn.console.log("end type check");

      for (const error of typeErrors) {
        const message = this.i18n.localize(typeErrorLocalizer, error);

        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          message,
          range: {
            start: aiLocation2LspPosition(error.location),
            end: aiLocation2LspPosition(error.location),
          },
          source: "aiscript-typing",
        });
      }

      this.conn.sendDiagnostics({
        uri: change.document.uri,
        diagnostics: diagnostics,
      });
    } catch (err) {
      const loc: SourceLocation = (err instanceof AiScriptError
        ? err.loc
        : null) ?? {
        column: 0,
        line: 0,
      };

      this.conn.sendDiagnostics({
        uri: change.document.uri,
        diagnostics: [
          {
            message: "" + err,
            range: {
              start: aiLocation2LspPosition(loc),
              end: aiLocation2LspPosition(loc),
            },
          },
        ],
      });
    }
  }
}
