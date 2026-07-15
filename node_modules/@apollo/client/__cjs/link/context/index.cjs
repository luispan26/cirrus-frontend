"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetContextLink = void 0;
exports.setContext = setContext;
const rxjs_1 = require("rxjs");
const link_1 = require("@apollo/client/link");
/**
 * @deprecated
 * Use `SetContextLink` from `@apollo/client/link/context` instead. Note you
 * will need to flip the arguments when using `SetContextLink` as `prevContext`
 * is the first argument.
 *
 * ```ts
 * new SetContextLink((prevContext, operation) => {
 *   // ...
 * });
 * ```
 */
function setContext(setter) {
    return new SetContextLink((prevContext, operation) => setter(operation, prevContext));
}
/**
 * `SetContextLink` is a non-terminating link that allows you to modify the
 * context of GraphQL operations before they're passed to the next link in the
 * chain. This is commonly used for authentication, adding headers, and other
 * request-time configuration.
 *
 * @example
 *
 * ```ts
 * import { SetContextLink } from "@apollo/client/link/context";
 *
 * const link = new SetContextLink((prevContext, operation) => {
 *   return {
 *     credentials: "include",
 *     // ...
 *   };
 * });
 * ```
 */
class SetContextLink extends link_1.ApolloLink {
    constructor(setter) {
        super((operation, forward) => {
            const { ...request } = operation;
            Object.defineProperty(request, "client", {
                enumerable: false,
                value: operation.client,
            });
            return new rxjs_1.Observable((observer) => {
                let closed = false;
                Promise.resolve(request)
                    .then((req) => setter(operation.getContext(), req))
                    .then(operation.setContext)
                    .then(() => {
                    if (!closed) {
                        forward(operation).subscribe(observer);
                    }
                })
                    .catch(observer.error.bind(observer));
                return () => {
                    closed = true;
                };
            });
        });
    }
}
exports.SetContextLink = SetContextLink;
//# sourceMappingURL=index.cjs.map
