"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMutation = void 0;
const tslib_1 = require("tslib");
const equality_1 = require("@wry/equality");
const React = tslib_1.__importStar(require("react"));
const internal_1 = require("@apollo/client/utilities/internal");
const useIsomorphicLayoutEffect_js_1 = require("./internal/useIsomorphicLayoutEffect.cjs");
const useApolloClient_js_1 = require("./useApolloClient.cjs");
/**
* 
*/
exports.useMutation = function useMutation(mutation, options) {
    const client = (0, useApolloClient_js_1.useApolloClient)(options?.client);
    const [result, setResult] = React.useState(() => createInitialResult(client));
    const ref = React.useRef({
        result,
        mutationId: 0,
        isMounted: true,
        client,
        mutation,
        options,
    });
    (0, useIsomorphicLayoutEffect_js_1.useIsomorphicLayoutEffect)(() => {
        Object.assign(ref.current, { client, options, mutation });
    });
    const execute = React.useCallback((executeOptions = {}) => {
        const { options, mutation } = ref.current;
        const baseOptions = { ...options, mutation };
        const client = executeOptions.client || ref.current.client;
        const context = typeof executeOptions.context === "function" ?
            executeOptions.context(options?.context)
            : executeOptions.context;
        if (!ref.current.result.loading && ref.current.isMounted) {
            setResult((ref.current.result = {
                loading: true,
                error: undefined,
                data: undefined,
                called: true,
                client,
            }));
        }
        const mutationId = ++ref.current.mutationId;
        const clientOptions = (0, internal_1.mergeOptions)(baseOptions, {
            ...executeOptions,
            context,
        });
        return (0, internal_1.preventUnhandledRejection)(client
            .mutate(clientOptions)
            .then((response) => {
            const { data, error } = response;
            const onError = executeOptions.onError || ref.current.options?.onError;
            if (error && onError) {
                onError(error, clientOptions);
            }
            if (mutationId === ref.current.mutationId) {
                const result = {
                    called: true,
                    loading: false,
                    data,
                    error,
                    client,
                };
                if (ref.current.isMounted &&
                    !(0, equality_1.equal)(ref.current.result, result)) {
                    setResult((ref.current.result = result));
                }
            }
            const onCompleted = executeOptions.onCompleted || ref.current.options?.onCompleted;
            if (!error) {
                onCompleted?.(response.data, clientOptions);
            }
            return response;
        }, (error) => {
            if (mutationId === ref.current.mutationId &&
                ref.current.isMounted) {
                const result = {
                    loading: false,
                    error,
                    data: void 0,
                    called: true,
                    client,
                };
                if (!(0, equality_1.equal)(ref.current.result, result)) {
                    setResult((ref.current.result = result));
                }
            }
            const onError = executeOptions.onError || ref.current.options?.onError;
            if (onError) {
                onError(error, clientOptions);
            }
            throw error;
        }));
    }, []);
    const reset = React.useCallback(() => {
        if (ref.current.isMounted) {
            const result = createInitialResult(ref.current.client);
            Object.assign(ref.current, { mutationId: 0, result });
            setResult(result);
        }
    }, []);
    React.useEffect(() => {
        const current = ref.current;
        current.isMounted = true;
        return () => {
            current.isMounted = false;
        };
    }, []);
    return [execute, { reset, ...result }];
};
function createInitialResult(client) {
    return {
        data: undefined,
        error: undefined,
        called: false,
        loading: false,
        client,
    };
}
//# sourceMappingURL=useMutation.cjs.map
