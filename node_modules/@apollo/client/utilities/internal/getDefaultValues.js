import { valueToObjectRepresentation } from "./valueToObjectRepresentation.js";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function getDefaultValues(definition) {
    const defaultValues = {};
    const defs = definition && definition.variableDefinitions;
    if (defs && defs.length) {
        defs.forEach((def) => {
            if (def.defaultValue) {
                valueToObjectRepresentation(defaultValues, def.variable.name, def.defaultValue);
            }
        });
    }
    return defaultValues;
}
//# sourceMappingURL=getDefaultValues.js.map
