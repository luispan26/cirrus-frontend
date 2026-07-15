import { c as _c } from "@apollo/client/react/internal/compiler-runtime";
import { equal } from "@wry/equality";
import * as React from "react";
import { mergeOptions, preventUnhandledRejection, } from "@apollo/client/utilities/internal";
import { useIsomorphicLayoutEffect } from "./internal/useIsomorphicLayoutEffect.js";
import { useApolloClient } from "./useApolloClient.js";
/**
* 
*/
export const useMutation = function useMutation(mutation, options) {
    const $ = _c(17);
    const client = useApolloClient(options?.client);
    let t0;

    if ($[0] !== client) {
        t0 = () => createInitialResult(client);
        $[0] = client;
        $[1] = t0;
    } else {
        t0 = $[1];
    }

    const [result, setResult] = React.useState(t0);
    let t1;

    if ($[2] !== client || $[3] !== mutation || $[4] !== options || $[5] !== result) {
        t1 = {
            result,
            mutationId: 0,
            isMounted: true,
            client,
            mutation,
            options
        };
        $[2] = client;
        $[3] = mutation;
        $[4] = options;
        $[5] = result;
        $[6] = t1;
    } else {
        t1 = $[6];
    }

    const ref = React.useRef(t1);
    let t2;

    if ($[7] !== client || $[8] !== mutation || $[9] !== options) {
        t2 = () => {
            Object.assign(ref.current, {
                client,
                options,
                mutation
            });
        };
        $[7] = client;
        $[8] = mutation;
        $[9] = options;
        $[10] = t2;
    } else {
        t2 = $[10];
    }

    useIsomorphicLayoutEffect(t2);
    let t3;

    if ($[11] === Symbol.for("react.memo_cache_sentinel")) {
        t3 = t4 => {
            const executeOptions = t4 === undefined ? {} : t4;
            const {
                options: options_0,
                mutation: mutation_0
            } = ref.current;
            const baseOptions = {
                ...options_0,
                mutation: mutation_0
            };
            const client_0 = executeOptions.client || ref.current.client;
            const context = typeof executeOptions.context === "function" ? executeOptions.context(options_0?.context) : executeOptions.context;
            if (!ref.current.result.loading && ref.current.isMounted) {
                setResult(ref.current.result = {
                    loading: true,
                    error: undefined,
                    data: undefined,
                    called: true,
                    client: client_0
                });
            }
            const mutationId = ref.current.mutationId = ref.current.mutationId + 1;
            const clientOptions = mergeOptions(baseOptions, {
                ...executeOptions,
                context
            });

            return preventUnhandledRejection(client_0.mutate(clientOptions).then(response => {
                const {
                    data,
                    error
                } = response;
                const onError = executeOptions.onError || ref.current.options?.onError;
                if (error && onError) {
                    onError(error, clientOptions);
                }
                if (mutationId === ref.current.mutationId) {
                    const result_0 = {
                        called: true,
                        loading: false,
                        data,
                        error,
                        client: client_0
                    };
                    if (ref.current.isMounted && !equal(ref.current.result, result_0)) {
                        setResult(ref.current.result = result_0);
                    }
                }
                const onCompleted = executeOptions.onCompleted || ref.current.options?.onCompleted;
                if (!error) {
                    onCompleted?.(response.data, clientOptions);
                }
                return response;
            }, error_0 => {
                if (mutationId === ref.current.mutationId && ref.current.isMounted) {
                    const result_1 = {
                        loading: false,
                        error: error_0,
                        data: void 0,
                        called: true,
                        client: client_0
                    };
                    if (!equal(ref.current.result, result_1)) {
                        setResult(ref.current.result = result_1);
                    }
                }
                const onError_0 = executeOptions.onError || ref.current.options?.onError;
                if (onError_0) {
                    onError_0(error_0, clientOptions);
                }
                throw error_0;
            }));
        };
        $[11] = t3;
    } else {
        t3 = $[11];
    }

    const execute = t3;
    let t4;

    if ($[12] === Symbol.for("react.memo_cache_sentinel")) {
        t4 = () => {
            if (ref.current.isMounted) {
                const result_2 = createInitialResult(ref.current.client);

                Object.assign(ref.current, {
                    mutationId: 0,
                    result: result_2
                });

                setResult(result_2);
            }
        };
        $[12] = t4;
    } else {
        t4 = $[12];
    }

    const reset = t4;
    let t5;
    let t6;

    if ($[13] === Symbol.for("react.memo_cache_sentinel")) {
        t5 = () => {
            const current = ref.current;
            current.isMounted = true;

            return () => {
                current.isMounted = false;
            };
        };t6 = [];
        $[13] = t5;
        $[14] = t6;
    } else {
        t5 = $[13];
        t6 = $[14];
    }

    React.useEffect(t5, t6);
    let t7;

    if ($[15] !== result) {
        t7 = [execute, {
            reset,
            ...result
        }];
        $[15] = result;
        $[16] = t7;
    } else {
        t7 = $[16];
    }

    return t7;
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
//# sourceMappingURL=useMutation.js.map
