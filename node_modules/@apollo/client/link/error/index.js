import { Observable } from "rxjs";
import { CombinedGraphQLErrors, graphQLResultHasProtocolErrors, PROTOCOL_ERRORS_SYMBOL, toErrorLike, } from "@apollo/client/errors";
import { ApolloLink } from "@apollo/client/link";
/**
 * @deprecated
 * Use `ErrorLink` from `@apollo/client/link/error` instead.
 */
export function onError(errorHandler) {
    return new ErrorLink(errorHandler);
}
/**
 * Use the `ErrorLink` to perform custom logic when a [GraphQL or network error](https://apollographql.com/docs/react/data/error-handling)
 * occurs.
 *
 * @remarks
 *
 * This link is used after the GraphQL operation completes and execution is
 * moving back up your [link chain](https://apollographql.com/docs/react/api/link/introduction#handling-a-response). The `errorHandler` function should
 * not return a value unless you want to [retry the operation](https://apollographql.com/docs/react/data/error-handling#retrying-operations).
 *
 * For more information on the types of errors that might be encountered, see
 * the guide on [error handling](https://apollographql.com/docs/react/data/error-handling).
 *
 * @example
 *
 * ```ts
 * import { ErrorLink } from "@apollo/client/link/error";
 * import {
 *   CombinedGraphQLErrors,
 *   CombinedProtocolErrors,
 * } from "@apollo/client/errors";
 *
 * // Log any GraphQL errors, protocol errors, or network error that occurred
 * const errorLink = new ErrorLink(({ error, operation }) => {
 *   if (CombinedGraphQLErrors.is(error)) {
 *     error.errors.forEach(({ message, locations, path }) =>
 *       console.log(
 *         `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
 *       )
 *     );
 *   } else if (CombinedProtocolErrors.is(error)) {
 *     error.errors.forEach(({ message, extensions }) =>
 *       console.log(
 *         `[Protocol error]: Message: ${message}, Extensions: ${JSON.stringify(
 *           extensions
 *         )}`
 *       )
 *     );
 *   } else {
 *     console.error(`[Network error]: ${error}`);
 *   }
 * });
 * ```
 */
export class ErrorLink extends ApolloLink {
    constructor(errorHandler) {
        super((operation, forward) => {
            return new Observable((observer) => {
                let sub;
                let retriedSub;
                let retriedResult;
                try {
                    sub = forward(operation).subscribe({
                        next: (result) => {
                            const handler = operation.client["queryManager"].incrementalHandler;
                            const errors = handler.isIncrementalResult(result) ?
                                handler.extractErrors(result)
                                : result.errors;
                            if (errors) {
                                retriedResult = errorHandler({
                                    error: new CombinedGraphQLErrors(result, errors),
                                    result,
                                    operation,
                                    forward,
                                });
                            }
                            else if (graphQLResultHasProtocolErrors(result)) {
                                retriedResult = errorHandler({
                                    error: result.extensions[PROTOCOL_ERRORS_SYMBOL],
                                    result,
                                    operation,
                                    forward,
                                });
                            }
                            retriedSub = retriedResult?.subscribe(observer);
                            if (!retriedSub) {
                                observer.next(result);
                            }
                        },
                        error: (error) => {
                            retriedResult = errorHandler({
                                operation,
                                error: toErrorLike(error),
                                forward,
                            });
                            retriedSub = retriedResult?.subscribe(observer);
                            if (!retriedSub) {
                                observer.error(error);
                            }
                        },
                        complete: () => {
                            // disable the previous sub from calling complete on observable
                            // if retry is in flight.
                            if (!retriedResult) {
                                observer.complete();
                            }
                        },
                    });
                }
                catch (e) {
                    errorHandler({ error: toErrorLike(e), operation, forward });
                    observer.error(e);
                }
                return () => {
                    if (sub)
                        sub.unsubscribe();
                    if (retriedSub)
                        retriedSub.unsubscribe();
                };
            });
        });
    }
}
//# sourceMappingURL=index.js.map