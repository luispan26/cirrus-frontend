"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prerenderStatic = prerenderStatic;
const tslib_1 = require("tslib");
const graphql_1 = require("graphql");
const React = tslib_1.__importStar(require("react"));
const rxjs_1 = require("rxjs");
const react_1 = require("@apollo/client/react");
const internal_1 = require("@apollo/client/react/internal");
const utilities_1 = require("@apollo/client/utilities");
const invariant_1 = require("@apollo/client/utilities/invariant");
const useSSRQuery_js_1 = require("./useSSRQuery.cjs");
function getObservableQueryKey(query, variables = {}) {
    const queryKey = (0, graphql_1.print)(query);
    const variablesKey = (0, utilities_1.canonicalStringify)(variables);
    return `${queryKey}|${variablesKey}`;
}
const noopObserver = { complete() { } };
/**
 * This function will rerender your React tree until no more network requests need
 * to be made.
 * If you only use suspenseful hooks (and a suspense-ready `renderFunction`), this
 * means that the tree will be rendered once.
 * If you use non-suspenseful hooks like `useQuery`, this function will render all
 * components, wait for all requests started by your rendered
 * hooks to finish, and then render the tree again, until no more requests are made.
 *
 * After executing this function, you can use `client.extract()` to get a full set
 * of the data that was fetched during these renders.
 * You can then transport that data and hydrate your cache via `client.restore(extractedData)`
 * before hydrating your React tree in the browser.
 */
function prerenderStatic(
    { tree, context = {}, 
    // The rendering function is configurable! We use renderToStaticMarkup as
    // the default, because it's a little less expensive than renderToString,
    // and legacy usage of getDataFromTree ignores the return value anyway.
    renderFunction, signal, ignoreResults, diagnostics, maxRerenders = 50, }
) {
    const availableObservableQueries = new Map();
    const subscriptions = new Set();
    let recentlyCreatedObservableQueries = new Set();
    let renderCount = 0;
    const internalContext = {
        getObservableQuery(query, variables) {
            return availableObservableQueries.get(getObservableQueryKey(query, variables));
        },
        onCreatedObservableQuery: (observable, query, variables) => {
            availableObservableQueries.set(getObservableQueryKey(query, variables), observable);
            // we keep the observable subscribed to until we are done with rendering
            // otherwise it will be torn down after every render pass
            subscriptions.add(observable.subscribe(noopObserver));
            if (observable.options.fetchPolicy !== "cache-only") {
                recentlyCreatedObservableQueries.add(observable);
            }
        },
    };
    async function process() {
        renderCount++;
        (0, invariant_1.invariant)(renderCount <= maxRerenders, 25, maxRerenders);
        (0, invariant_1.invariant)(!signal?.aborted, 26);
        // Always re-render from the rootElement, even though it might seem
        // better to render the children of the component responsible for the
        // promise, because it is not possible to reconstruct the full context
        // of the original rendering (including all unknown context provider
        // elements) for a subtree of the original component tree.
        const ApolloContext = (0, react_1.getApolloContext)();
        const element = (React.createElement(ApolloContext.Provider, { value: {
                ...context,
                [internal_1.wrapperSymbol]: {
                    useQuery: () => useSSRQuery_js_1.useSSRQuery.bind(internalContext),
                },
            } }, tree));
        const renderFnResult = await renderFunction(element);
        const result = await consume(renderFnResult);
        if (recentlyCreatedObservableQueries.size == 0) {
            return {
                result,
                renderFnResult,
                aborted: signal?.aborted ?? false,
            };
        }
        if (signal?.aborted) {
            return {
                result,
                renderFnResult,
                aborted: true,
            };
        }
        const dataPromise = Promise.all(Array.from(recentlyCreatedObservableQueries).map(async (observable) => {
            await (0, rxjs_1.firstValueFrom)(observable.pipe((0, rxjs_1.filter)((result) => result.loading === false)));
            recentlyCreatedObservableQueries.delete(observable);
        }));
        let resolveAbortPromise;
        const abortPromise = new Promise((resolve) => {
            resolveAbortPromise = resolve;
        });
        signal?.addEventListener("abort", resolveAbortPromise);
        await Promise.race([abortPromise, dataPromise]);
        signal?.removeEventListener("abort", resolveAbortPromise);
        if (signal?.aborted) {
            return {
                result,
                renderFnResult,
                aborted: true,
            };
        }
        return process();
    }
    return Promise.resolve()
        .then(process)
        .then((result) => diagnostics ?
        {
            ...result,
            diagnostics: {
                renderCount,
            },
        }
        : result)
        .finally(() => {
        availableObservableQueries.clear();
        recentlyCreatedObservableQueries.clear();
        subscriptions.forEach((subscription) => subscription.unsubscribe());
        subscriptions.clear();
    });
    async function consume(value) {
        if (typeof value === "string") {
            return ignoreResults ? "" : value;
        }
        if (!value.prelude) {
            throw new Error("`getMarkupFromTree` was called with an incompatible render method.\n" +
                'It is compatible with `renderToStaticMarkup` and `renderToString`  from `"react-dom/server"`\n' +
                'as well as `prerender` and `prerenderToNodeStream` from "react-dom/static"');
        }
        const prelude = value.prelude;
        let result = "";
        if ("getReader" in prelude) {
            /**
             * The "web" `ReadableStream` consuming path.
             * This could also be done with the `AsyncIterable` branch, but we add this
             * code for two reasons:
             *
             * 1.  potential performance benefits if we don't need to create an `AsyncIterator` on top
             * 2.  some browsers (looking at Safari) don't support `AsyncIterable` for `ReadableStream` yet
             *     and we're not 100% sure how good this is covered on edge runtimes
             *
             * The extra code here doesn't really matter, since _usually_ this would not
             * be run in a browser, so we don't have to shave every single byte.
             */
            const reader = prelude.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                if (!ignoreResults) {
                    result += Buffer.from(value).toString("utf8");
                }
            }
        }
        else {
            for await (const chunk of prelude) {
                if (!ignoreResults) {
                    result +=
                        typeof chunk === "string" ? chunk : (Buffer.from(chunk).toString("utf8"));
                }
            }
        }
        return result;
    }
}
//# sourceMappingURL=prerenderStatic.cjs.map
