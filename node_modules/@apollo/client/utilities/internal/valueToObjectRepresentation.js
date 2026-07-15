import { Kind } from "graphql";
import { newInvariantError } from "@apollo/client/utilities/invariant";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function valueToObjectRepresentation(argObj, name, value, variables) {
    if (value.kind === Kind.INT || value.kind === Kind.FLOAT) {
        argObj[name.value] = Number(value.value);
    }
    else if (value.kind === Kind.BOOLEAN || value.kind === Kind.STRING) {
        argObj[name.value] = value.value;
    }
    else if (value.kind === Kind.OBJECT) {
        const nestedArgObj = {};
        value.fields.map((obj) => valueToObjectRepresentation(nestedArgObj, obj.name, obj.value, variables));
        argObj[name.value] = nestedArgObj;
    }
    else if (value.kind === Kind.VARIABLE) {
        const variableValue = (variables || {})[value.name.value];
        argObj[name.value] = variableValue;
    }
    else if (value.kind === Kind.LIST) {
        argObj[name.value] = value.values.map((listValue) => {
            const nestedArgArrayObj = {};
            valueToObjectRepresentation(nestedArgArrayObj, name, listValue, variables);
            return nestedArgArrayObj[name.value];
        });
    }
    else if (value.kind === Kind.ENUM) {
        argObj[name.value] = value.value;
    }
    else if (value.kind === Kind.NULL) {
        argObj[name.value] = null;
    }
    else {
        throw newInvariantError(19, name.value, value.kind);
    }
}
//# sourceMappingURL=valueToObjectRepresentation.js.map
