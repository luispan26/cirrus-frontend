export declare const PROTOCOL_ERRORS_SYMBOL: unique symbol;
export declare function graphQLResultHasProtocolErrors<T extends {}>(result: T): result is T & {
    extensions: Record<string | symbol, any>;
};
export declare function toErrorLike(error: unknown): import("@apollo/client").ErrorLike;
export { CombinedGraphQLErrors } from "./CombinedGraphQLErrors.cjs";
export { CombinedProtocolErrors } from "./CombinedProtocolErrors.cjs";
export { isErrorLike } from "./isErrorLike.cjs";
export { LinkError, registerLinkError } from "./LinkError.cjs";
export { LocalStateError } from "./LocalStateError.cjs";
export { ServerError } from "./ServerError.cjs";
export { ServerParseError } from "./ServerParseError.cjs";
export { UnconventionalError } from "./UnconventionalError.cjs";
//# sourceMappingURL=index.d.cts.map
