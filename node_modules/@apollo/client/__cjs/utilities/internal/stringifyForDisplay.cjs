"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringifyForDisplay = stringifyForDisplay;
const makeUniqueId_js_1 = require("./makeUniqueId.cjs");
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function stringifyForDisplay(value, space = 0) {
    const undefId = (0, makeUniqueId_js_1.makeUniqueId)("stringifyForDisplay");
    return JSON.stringify(value, (_, value) => {
        return value === void 0 ? undefId : value;
    }, space)
        .split(JSON.stringify(undefId))
        .join("<undefined>");
}
//# sourceMappingURL=stringifyForDisplay.cjs.map
