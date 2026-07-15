"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.argumentsObjectFromField = argumentsObjectFromField;
const valueToObjectRepresentation_js_1 = require("./valueToObjectRepresentation.cjs");
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function argumentsObjectFromField(field, variables) {
    if (field.arguments && field.arguments.length) {
        const argObj = {};
        field.arguments.forEach(({ name, value }) => (0, valueToObjectRepresentation_js_1.valueToObjectRepresentation)(argObj, name, value, variables));
        return argObj;
    }
    return null;
}
//# sourceMappingURL=argumentsObjectFromField.cjs.map
