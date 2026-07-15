"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canUseDOM = void 0;
const globals_1 = require("@apollo/client/utilities/internal/globals");
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
exports.canUseDOM = typeof (0, globals_1.maybe)(() => window.document.createElement) === "function";
//# sourceMappingURL=canUseDOM.cjs.map
