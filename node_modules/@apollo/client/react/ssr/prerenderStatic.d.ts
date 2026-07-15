import type * as ReactTypes from "react";
import type { ApolloClient, DocumentNode, ObservableQuery, OperationVariables } from "@apollo/client";
export interface PrerenderStaticInternalContext {
    getObservableQuery(query: DocumentNode, variables?: Record<string, any>): ObservableQuery | undefined;
    onCreatedObservableQuery: (observable: ObservableQuery, query: DocumentNode, variables: OperationVariables) => void;
}
export declare namespace prerenderStatic {
    /**
    * The rendering function to use.
    * These functions are currently supported:
    * 
    * - `prerender` from `react-dom/static` (https://react.dev/reference/react-dom/static/prerender)
    *   - recommended if you use Deno or a modern edge runtime with Web Streams
    * - `prerenderToNodeStream` from `react-dom/static` (https://react.dev/reference/react-dom/static/prerenderToNodeStream)
    *   - recommended if you use Node.js
    * - `renderToString` from `react-dom/server` (https://react.dev/reference/react-dom/server/renderToString)
    *   - this API has no suspense support and will not work with hooks like `useSuspenseQuery`
    * - `renderToStaticMarkup` from `react-dom/server` (https://react.dev/reference/react-dom/server/renderToStaticMarkup)
    *   - slightly faster than `renderToString`, but the result cannot be hydrated
    *   - this API has no suspense support and will not work with hooks like `useSuspenseQuery`
    */
    type PrerenderFunction = RenderToString | RenderToStringPromise | PrerenderToWebStream | PrerenderToNodeStream | ((reactNode: ReactTypes.ReactNode) => ReturnType<RenderToString> | ReturnType<RenderToStringPromise> | ReturnType<PrerenderToWebStream> | ReturnType<PrerenderToNodeStream>);
    interface Options<Prerender extends PrerenderFunction = PrerenderFunction> {
        /**
         * The React component tree to prerender
         */
        tree: ReactTypes.ReactNode;
        /**
         * If your app is not wrapped in an `ApolloProvider`, you can pass a `client` instance in here.
         */
        context?: {
            client?: ApolloClient;
        };
        /**
         * An `AbortSignal` that indicates you want to stop the re-render loop, even if not all data is fetched yet.
         *
         * Note that if you use an api like `prerender` or `prerenderToNodeStream` that supports `AbortSignal` as an option,
         * you will still have to pass that `signal` option to that function by wrapping the `renderFunction`, and if that api
         * throws an exception if the signal is aborted, so will `prerenderStatic`.
         *
         * @example
         *
         * ```ts
         * const result = await prerenderStatic({
         *   tree: <App/>,
         *   signal,
         *   renderFunction: (tree) => prerender(tree, { signal }),
         * })
         * ```
         */
        signal?: AbortSignal;
        /**
         * If this is set, this method will return `""` as the `result` property.
         * Setting this can save CPU time that would otherwise be spent on converting
         * `Uint8Array` or `Buffer` instances to strings for the result.
         */
        ignoreResults?: boolean;
        /**
         * The rendering function to use.
         * These functions are currently supported:
         *
         * - `prerender` from `react-dom/static` (https://react.dev/reference/react-dom/static/prerender)
         *   - recommended if you use Deno or a modern edge runtime with Web Streams
         * - `prerenderToNodeStream` from `react-dom/static` (https://react.dev/reference/react-dom/static/prerenderToNodeStream)
         *   - recommended if you use Node.js
         * - `renderToString` from `react-dom/server` (https://react.dev/reference/react-dom/server/renderToString)
         *   - this API has no suspense support and will not work with hooks like `useSuspenseQuery`
         * - `renderToStaticMarkup` from `react-dom/server` (https://react.dev/reference/react-dom/server/renderToStaticMarkup)
         *   - slightly faster than `renderToString`, but the result cannot be hydrated
         *   - this API has no suspense support and will not work with hooks like `useSuspenseQuery`
         */
        renderFunction: Prerender;
        /**
         * If this is set to `true`, the result will contain a `diagnostics` property that can help you e.g. detect `useQuery` waterfalls in your application.
         * @defaultValue false
         */
        diagnostics?: boolean;
        /**
         * The maximum number of times the tree will be rerendered until no more network requests are made.
         * This is useful to prevent infinite loops in case of a bug in your application.
         * If you have a lot of waterfalls in your application, you might need to increase this number.
         *
         * @defaultValue 50
         */
        maxRerenders?: number;
    }
    interface Result<Prerender extends PrerenderFunction = PrerenderFunction> {
        /**
         * The result of the last render, or an empty string if `ignoreResults` was set to `true`.
         */
        result: string;
        /**
         * The result of the last execution of the `renderFunction`.
         */
        renderFnResult: ReturnType<Prerender> extends PromiseLike<infer U> ? U : ReturnType<Prerender>;
        /**
         * If the render was aborted early because the `AbortSignal` was cancelled,
         * this will be `true`.
         * If you used a hydratable render function (everything except `renderToStaticMarkup`),
         * the result will still be able to hydrate in the browser, but it might still
         * contain `loading` states and need additional data fetches in the browser.
         */
        aborted: boolean;
        /**
         * If `diagnostics` was set to `true`, this will contain an object with diagnostics that can be used to
         * detect ineffective rendering structures in your app.
         */
        diagnostics?: Diagnostics;
    }
    interface Diagnostics {
        /**
         * The number of times the tree had to be rerendered until no more network requests
         * were made.
         * A high number here might indicate that you have a waterfall of `useQuery` calls
         * in your application and shows potential for optimization, e.g. via fragment colocation.
         */
        renderCount: number;
    }
    type RenderToString = (element: ReactTypes.ReactNode) => string;
    type RenderToStringPromise = (element: ReactTypes.ReactNode) => PromiseLike<string>;
    type PrerenderToWebStream = (reactNode: ReactTypes.ReactNode) => Promise<{
        prelude: ReadableStream<Uint8Array>;
    }>;
    type PrerenderToNodeStream = (reactNode: ReactTypes.ReactNode) => Promise<{
        prelude: AsyncIterable<string | Buffer>;
    }>;
}
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
export declare function prerenderStatic<Prerender extends prerenderStatic.PrerenderFunction = prerenderStatic.PrerenderFunction>({ tree, context, renderFunction, signal, ignoreResults, diagnostics, maxRerenders, }: prerenderStatic.Options<Prerender>): Promise<prerenderStatic.Result<Prerender>>;
//# sourceMappingURL=prerenderStatic.d.ts.map
