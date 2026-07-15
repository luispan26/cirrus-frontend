"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeKeyNameFromField = storeKeyNameFromField;
const getStoreKeyName_js_1 = require("./getStoreKeyName.cjs");
const valueToObjectRepresentation_js_1 = require("./valueToObjectRepresentation.cjs");
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function storeKeyNameFromField(field, variables) {
    let directivesObj = null;
    if (field.directives) {
        directivesObj = {};
        field.directives.forEach((directive) => {
            directivesObj[directive.name.value] = {};
            if (directive.arguments) {
                directive.arguments.forEach(({ name, value }) => (0, valueToObjectRepresentation_js_1.valueToObjectRepresentation)(directivesObj[directive.name.value], name, value, variables));
            }
        });
    }
    let argObj = null;
    if (field.arguments && field.arguments.length) {
        argObj = {};
        field.arguments.forEach(({ name, value }) => (0, valueToObjectRepresentation_js_1.valueToObjectRepresentation)(argObj, name, value, variables));
    }
    return (0, getStoreKeyName_js_1.getStoreKeyName)(field.name.value, argObj, directivesObj);
}
//# sourceMappingURL=storeKeyNameFromField.cjs.map
