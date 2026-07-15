"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resultKeyNameFromField = resultKeyNameFromField;
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function resultKeyNameFromField(field) {
    return field.alias ? field.alias.value : field.name.value;
}
//# sourceMappingURL=resultKeyNameFromField.cjs.map
