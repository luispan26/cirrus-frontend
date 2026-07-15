import { c as _c } from "@apollo/client/react/internal/compiler-runtime";
import { equal } from "@wry/equality";
import * as React from "react";
import { invariant } from "@apollo/client/utilities/invariant";
import { useDeepMemo } from "./internal/useDeepMemo.js";
import { useIsomorphicLayoutEffect } from "./internal/useIsomorphicLayoutEffect.js";
import { useApolloClient } from "./useApolloClient.js";
import { useSyncExternalStore } from "./useSyncExternalStore.js";
/**
 * > Refer to the [Subscriptions](https://www.apollographql.com/docs/react/data/subscriptions/) section for a more in-depth overview of `useSubscription`.
 *
 * @example
 *
 * ```jsx
 * const COMMENTS_SUBSCRIPTION = gql`
 *   subscription OnCommentAdded($repoFullName: String!) {
 *     commentAdded(repoFullName: $repoFullName) {
 *       id
 *       content
 *     }
 *   }
 * `;
 *
 * function DontReadTheComments({ repoFullName }) {
 *   const {
 *     data: { commentAdded },
 *     loading,
 *   } = useSubscription(COMMENTS_SUBSCRIPTION, { variables: { repoFullName } });
 *   return <h4>New comment: {!loading && commentAdded.content}</h4>;
 * }
 * ```
 *
 * @remarks
 *
 * #### Consider using `onData` instead of `useEffect`
 *
 * If you want to react to incoming data, please use the `onData` option instead of `useEffect`.
 * State updates you make inside a `useEffect` hook might cause additional rerenders, and `useEffect` is mostly meant for side effects of rendering, not as an event handler.
 * State updates made in an event handler like `onData` might - depending on the React version - be batched and cause only a single rerender.
 *
 * Consider the following component:
 *
 * ```jsx
 * export function Subscriptions() {
 *   const { data, error, loading } = useSubscription(query);
 *   const [accumulatedData, setAccumulatedData] = useState([]);
 *
 *   useEffect(() => {
 *     setAccumulatedData((prev) => [...prev, data]);
 *   }, [data]);
 *
 *   return (
 *     <>
 *       {loading && <p>Loading...</p>}
 *       {JSON.stringify(accumulatedData, undefined, 2)}
 *     </>
 *   );
 * }
 * ```
 *
 * Instead of using `useEffect` here, we can re-write this component to use the `onData` callback function accepted in `useSubscription`'s `options` object:
 *
 * ```jsx
 * export function Subscriptions() {
 *   const [accumulatedData, setAccumulatedData] = useState([]);
 *   const { data, error, loading } = useSubscription(query, {
 *     onData({ data }) {
 *       setAccumulatedData((prev) => [...prev, data.data]);
 *     },
 *   });
 *
 *   return (
 *     <>
 *       {loading && <p>Loading...</p>}
 *       {JSON.stringify(accumulatedData, undefined, 2)}
 *     </>
 *   );
 * }
 * ```
 *
 * > ⚠️ **Note:** The `useSubscription` option `onData` is available in Apollo Client >= 3.7. In previous versions, the equivalent option is named `onSubscriptionData`.
 *
 * Now, the first message will be added to the `accumulatedData` array since `onData` is called _before_ the component re-renders. React 18 automatic batching is still in effect and results in a single re-render, but with `onData` we can guarantee each message received after the component mounts is added to `accumulatedData`.
 *
 * @param subscription - A GraphQL subscription document parsed into an AST by `gql`.
 * @param options - Options to control how the subscription is executed.
 * @returns Query result object
 */
export function useSubscription(subscription, ...t0) {
    const $ = _c(36);
    const [t1] = t0;
    let t2;

    if ($[0] !== t1) {
        t2 = t1 === undefined ? {} : t1;
        $[0] = t1;
        $[1] = t2;
    } else {
        t2 = $[1];
    }

    const options = t2;
    const client = useApolloClient(options.client);
    const {
        skip,
        fetchPolicy,
        errorPolicy,
        shouldResubscribe,
        context,
        extensions,
        ignoreResults
    } = options;
    let t3;
    let t4;

    if ($[2] !== options.variables) {
        t3 = () => options.variables;t4 = [options.variables];
        $[2] = options.variables;
        $[3] = t3;
        $[4] = t4;
    } else {
        t3 = $[3];
        t4 = $[4];
    }

    const variables = useDeepMemo(t3, t4);
    let t5;

    if ($[5] !== client || $[6] !== context || $[7] !== errorPolicy || $[8] !== extensions || $[9] !== fetchPolicy || $[10] !== subscription || $[11] !== variables) {
        t5 = () => createSubscription(
            client,
            subscription,
            variables,
            fetchPolicy,
            errorPolicy,
            context,
            extensions
        );
        $[5] = client;
        $[6] = context;
        $[7] = errorPolicy;
        $[8] = extensions;
        $[9] = fetchPolicy;
        $[10] = subscription;
        $[11] = variables;
        $[12] = t5;
    } else {
        t5 = $[12];
    }

    const recreate = t5;
    const [t6, setObservable] = React.useState(options.skip ? null : recreate);
    let observable = t6;
    const recreateRef = React.useRef(recreate);
    let t7;

    if ($[13] !== recreate) {
        t7 = () => {
            recreateRef.current = recreate;
        };
        $[13] = recreate;
        $[14] = t7;
    } else {
        t7 = $[14];
    }

    useIsomorphicLayoutEffect(t7);
    if (skip) {
        if (observable) {
            setObservable(observable = null);
        }
    } else {
        if (!observable || (client !== observable.__.client || subscription !== observable.__.query || fetchPolicy !== observable.__.fetchPolicy || errorPolicy !== observable.__.errorPolicy || !equal(variables, observable.__.variables)) && (typeof shouldResubscribe === "function" ? !!shouldResubscribe(options) : shouldResubscribe) !== false) {
            setObservable(observable = recreate());
        }
    }
    const optionsRef = React.useRef(options);
    let t8;

    if ($[15] !== options) {
        t8 = () => {
            optionsRef.current = options;
        };
        $[15] = options;
        $[16] = t8;
    } else {
        t8 = $[16];
    }

    React.useEffect(t8);
    const fallbackLoading = !skip && !ignoreResults;
    let t9;

    if ($[17] !== fallbackLoading) {
        t9 = {
            loading: fallbackLoading,
            error: void 0,
            data: void 0
        };
        $[17] = fallbackLoading;
        $[18] = t9;
    } else {
        t9 = $[18];
    }

    const fallbackResult = t9;
    const ignoreResultsRef = React.useRef(ignoreResults);
    let t10;

    if ($[19] !== ignoreResults) {
        t10 = () => {
            ignoreResultsRef.current = ignoreResults;
        };
        $[19] = ignoreResults;
        $[20] = t10;
    } else {
        t10 = $[20];
    }

    useIsomorphicLayoutEffect(t10);
    let t11;

    if ($[21] !== observable) {
        t11 = update => {
            if (!observable) {
                return _temp;
            }
            let subscriptionStopped = false;
            const client_0 = observable.__.client;
            const subscription_0 = observable.subscribe({
                next(value) {
                    if (subscriptionStopped) {
                        return;
                    }
                    const result = {
                        loading: false,
                        data: value.data,
                        error: value.error
                    };
                    observable.__.setResult(result);
                    if (!ignoreResultsRef.current) {
                        update();
                    }
                    if (result.error) {
                        optionsRef.current.onError?.(result.error);
                    } else {
                        if (optionsRef.current.onData) {
                            optionsRef.current.onData({
                                client: client_0,
                                data: result
                            });
                        }
                    }
                },

                complete() {
                    observable.__.completed = true;
                    if (!subscriptionStopped && optionsRef.current.onComplete) {
                        optionsRef.current.onComplete();
                    }
                }
            });

            return () => {
                subscriptionStopped = true;
                setTimeout(() => subscription_0.unsubscribe());
            };
        };
        $[21] = observable;
        $[22] = t11;
    } else {
        t11 = $[22];
    }

    observable;
    let t12;

    if ($[23] !== fallbackResult || $[24] !== ignoreResults || $[25] !== observable || $[26] !== skip) {
        t12 = () => observable && !skip && !ignoreResults ? observable.__.result : fallbackResult;
        $[23] = fallbackResult;
        $[24] = ignoreResults;
        $[25] = observable;
        $[26] = skip;
        $[27] = t12;
    } else {
        t12 = $[27];
    }

    let t13;

    if ($[28] !== fallbackResult) {
        t13 = () => fallbackResult;
        $[28] = fallbackResult;
        $[29] = t13;
    } else {
        t13 = $[29];
    }

    const ret = useSyncExternalStore(t11, t12, t13);
    let t14;

    if ($[30] !== observable || $[31] !== setObservable) {
        t14 = () => {
            invariant(!optionsRef.current.skip, 33);
            if (observable?.__.completed) {
                setObservable(recreateRef.current());
            } else {
                observable?.restart();
            }
        };
        $[30] = observable;
        $[31] = setObservable;
        $[32] = t14;
    } else {
        t14 = $[32];
    }

    observable;
    const restart = t14;
    let t15;

    if ($[33] !== restart || $[34] !== ret) {
        t15 = {
            ...ret,
            restart
        };
        $[33] = restart;
        $[34] = ret;
        $[35] = t15;
    } else {
        t15 = $[35];
    }

    return t15;
}
function _temp() {}
function createSubscription(client, query, variables, fetchPolicy, errorPolicy, context, extensions) {
    const options = {
        query,
        variables,
        fetchPolicy,
        errorPolicy,
        context,
        extensions,
    };
    const __ = {
        ...options,
        client,
        completed: false,
        result: {
            loading: true,
            data: void 0,
            error: void 0,
        },
        setResult(result) {
            __.result = result;
        },
    };
    return Object.assign(client.subscribe(options), {
        /**
         * A tracking object to store details about the observable and the latest result of the subscription.
         */
        __,
    });
}
//# sourceMappingURL=useSubscription.js.map
