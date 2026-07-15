"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.valueToObjectRepresentation = valueToObjectRepresentation;
const graphql_1 = require("graphql");
const invariant_1 = require("@apollo/client/utilities/invariant");
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function valueToObjectRepresentation(argObj, name, value, variables) {
    if (value.kind === graphql_1.Kind.INT || value.kind === graphql_1.Kind.FLOAT) {
        argObj[name.value] = Number(value.value);
    }
    else if (value.kind === graphql_1.Kind.BOOLEAN || value.kind === graphql_1.Kind.STRING) {
        argObj[name.value] = value.value;
    }
    else if (value.kind === graphql_1.Kind.OBJECT) {
        const nestedArgObj = {};
        value.fields.map((obj) => valueToObjectRepresentation(nestedArgObj, obj.name, obj.value, variables));
        argObj[name.value] = nestedArgObj;
    }
    else if (value.kind === graphql_1.Kind.VARIABLE) {
        const variableValue = (variables || {})[value.name.value];
        argObj[name.value] = variableValue;
    }
    else if (value.kind === graphql_1.Kind.LIST) {
        argObj[name.value] = value.values.map((listValue) => {
            const nestedArgArrayObj = {};
            valueToObjectRepresentation(nestedArgArrayObj, name, listValue, variables);
            return nestedArgArrayObj[name.value];
        });
    }
    else if (value.kind === graphql_1.Kind.ENUM) {
        argObj[name.value] = value.value;
    }
    else if (value.kind === graphql_1.Kind.NULL) {
        argObj[name.value] = null;
    }
    else {
        throw (0, invariant_1.newInvariantError)(19, name.value, value.kind);
    }
}
//# sourceMappingURL=valueToObjectRepresentation.cjs.map
