import {
  createConnection,
  ProposedFeatures,
} from "vscode-languageserver/node.js";
import { LanguageServer } from "../core/server/LanguageServer.js";
import { initAiScriptI18n } from "../core/i18n/aiscript/index.js";

const i18n = initAiScriptI18n("ja");

const server = new LanguageServer(i18n, createConnection(ProposedFeatures.all));

server.listen();
