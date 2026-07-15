"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRetryFunction = buildRetryFunction;
function buildRetryFunction(retryOptions) {
    const { retryIf, max = 5 } = retryOptions || {};
    return function retryFunction(count, operation, error) {
        if (count >= max)
            return false;
        return retryIf ? retryIf(error, operation) : !!error;
    };
}
//# sourceMappingURL=retryFunction.cjs.map
