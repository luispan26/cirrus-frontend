import { valueToObjectRepresentation } from "./valueToObjectRepresentation.js";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function argumentsObjectFromField(field, variables) {
    if (field.arguments && field.arguments.length) {
        const argObj = {};
        field.arguments.forEach(({ name, value }) => valueToObjectRepresentation(argObj, name, value, variables));
        return argObj;
    }
    return null;
}
//# sourceMappingURL=argumentsObjectFromField.js.map
