"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultValues = getDefaultValues;
const valueToObjectRepresentation_js_1 = require("./valueToObjectRepresentation.cjs");
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function getDefaultValues(definition) {
    const defaultValues = {};
    const defs = definition && definition.variableDefinitions;
    if (defs && defs.length) {
        defs.forEach((def) => {
            if (def.defaultValue) {
                (0, valueToObjectRepresentation_js_1.valueToObjectRepresentation)(defaultValues, def.variable.name, def.defaultValue);
            }
        });
    }
    return defaultValues;
}
//# sourceMappingURL=getDefaultValues.cjs.map
