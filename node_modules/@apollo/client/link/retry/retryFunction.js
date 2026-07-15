export function buildRetryFunction(retryOptions) {
    const { retryIf, max = 5 } = retryOptions || {};
    return function retryFunction(count, operation, error) {
        if (count >= max)
            return false;
        return retryIf ? retryIf(error, operation) : !!error;
    };
}
//# sourceMappingURL=retryFunction.js.map