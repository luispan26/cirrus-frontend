import { getStoreKeyName } from "./getStoreKeyName.js";
import { valueToObjectRepresentation } from "./valueToObjectRepresentation.js";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function storeKeyNameFromField(field, variables) {
    let directivesObj = null;
    if (field.directives) {
        directivesObj = {};
        field.directives.forEach((directive) => {
            directivesObj[directive.name.value] = {};
            if (directive.arguments) {
                directive.arguments.forEach(({ name, value }) => valueToObjectRepresentation(directivesObj[directive.name.value], name, value, variables));
            }
        });
    }
    let argObj = null;
    if (field.arguments && field.arguments.length) {
        argObj = {};
        field.arguments.forEach(({ name, value }) => valueToObjectRepresentation(argObj, name, value, variables));
    }
    return getStoreKeyName(field.name.value, argObj, directivesObj);
}
//# sourceMappingURL=storeKeyNameFromField.js.map
