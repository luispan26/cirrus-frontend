"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOperation = createOperation;
const internal_1 = require("@apollo/client/utilities/internal");
function createOperation(request, { client }) {
    const operation = {
        query: request.query,
        variables: request.variables || {},
        extensions: request.extensions || {},
        operationName: (0, internal_1.getOperationName)(request.query),
        operationType: (0, internal_1.getOperationDefinition)(request.query).operation,
    };
    let context = { ...request.context };
    const setContext = (next) => {
        if (typeof next === "function") {
            context = { ...context, ...next(getContext()) };
        }
        else {
            context = { ...context, ...next };
        }
    };
    const getContext = () => Object.freeze({ ...context });
    Object.defineProperty(operation, "setContext", {
        enumerable: false,
        value: setContext,
    });
    Object.defineProperty(operation, "getContext", {
        enumerable: false,
        value: getContext,
    });
    Object.defineProperty(operation, "client", {
        enumerable: false,
        value: client,
    });
    return operation;
}
//# sourceMappingURL=createOperation.cjs.map
