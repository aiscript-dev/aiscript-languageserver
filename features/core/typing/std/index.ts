import { Scope } from "../Scope.js";
import { fnType, ident } from "../TypeValue.js";
import { installCoreTypes } from "./Core.js";
import { installDateTypes } from "./Date.js";
import { installJsonTypes } from "./Json.js";
import { installMathTypes } from "./Math.js";
import { installNumTypes } from "./Num.js";
import { installStrTypes } from "./Str.js";
import { installUtilTypes } from "./Util.js";

export function installStdTypes(scope: Scope) {
  installCoreTypes(scope);
  installUtilTypes(scope);
  installJsonTypes(scope);
  installDateTypes(scope);
  installMathTypes(scope);
  installNumTypes(scope);
  installStrTypes(scope);
}
