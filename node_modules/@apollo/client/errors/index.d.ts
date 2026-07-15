export declare const PROTOCOL_ERRORS_SYMBOL: unique symbol;
export declare function graphQLResultHasProtocolErrors<T extends {}>(result: T): result is T & {
    extensions: Record<string | symbol, any>;
};
export declare function toErrorLike(error: unknown): import("@apollo/client").ErrorLike;
export { CombinedGraphQLErrors } from "./CombinedGraphQLErrors.js";
export { CombinedProtocolErrors } from "./CombinedProtocolErrors.js";
export { isErrorLike } from "./isErrorLike.js";
export { LinkError, registerLinkError } from "./LinkError.js";
export { LocalStateError } from "./LocalStateError.js";
export { ServerError } from "./ServerError.js";
export { ServerParseError } from "./ServerParseError.js";
export { UnconventionalError } from "./UnconventionalError.js";
//# sourceMappingURL=index.d.ts.map