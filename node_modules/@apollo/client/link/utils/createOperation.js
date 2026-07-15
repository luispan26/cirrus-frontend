import { getOperationDefinition, getOperationName, } from "@apollo/client/utilities/internal";
export function createOperation(request, { client }) {
    const operation = {
        query: request.query,
        variables: request.variables || {},
        extensions: request.extensions || {},
        operationName: getOperationName(request.query),
        operationType: getOperationDefinition(request.query).operation,
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
//# sourceMappingURL=createOperation.js.map