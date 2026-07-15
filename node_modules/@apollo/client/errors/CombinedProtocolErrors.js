import { brand, isBranded } from "./utils.js";
function defaultFormatMessage(errors) {
    return errors.map((e) => e.message || "Error message not found.").join("\n");
}
/**
 * Fatal transport-level errors returned when executing a subscription using the
 * multipart HTTP subscription protocol. See the documentation on the
 * [multipart HTTP protocol for GraphQL Subscriptions](https://www.apollographql.com/docs/graphos/routing/operations/subscriptions/multipart-protocol) for more information on these errors.
 *
 * @remarks
 *
 * These errors indicate issues with the subscription transport itself, rather
 * than GraphQL-level errors. They typically occur when there are problems
 * communicating with subgraphs from the Apollo Router.
 *
 * @example
 *
 * ```ts
 * import { CombinedProtocolErrors } from "@apollo/client/errors";
 *
 * // Check if an error is a CombinedProtocolErrors instance
 * if (CombinedProtocolErrors.is(error)) {
 *   // Access individual protocol errors
 *   error.errors.forEach((protocolError) => {
 *     console.log(protocolError.message);
 *     console.log(protocolError.extensions);
 *   });
 * }
 * ```
 */
export class CombinedProtocolErrors extends Error {
    /**
     * A method that determines whether an error is a `CombinedProtocolErrors`
     * object. This method enables TypeScript to narrow the error type.
     *
     * @example
     *
     * ```ts
     * if (CombinedProtocolErrors.is(error)) {
     *   // TypeScript now knows `error` is a CombinedProtocolErrors object
     *   console.log(error.errors);
     * }
     * ```
     */
    static is(error) {
        return isBranded(error, "CombinedProtocolErrors");
    }
    /**
    * A function that formats the error message used for the error's `message`
    * property. Override this method to provide your own formatting.
    * 
    * @remarks
    * 
    * The `formatMessage` function is called by the `CombinedProtocolErrors`
    * constructor to provide a formatted message as the `message` property of the
    * `CombinedProtocolErrors` object. Follow the ["Providing a custom message
    * formatter"](https://www.apollographql.com/docs/react/api/errors/CombinedProtocolErrors#providing-a-custom-message-formatter) guide to learn how to modify the message format.
    * 
    * @param errors - The array of GraphQL errors returned from the server in the
    * `errors` field of the response.
    * @param options - Additional context that could be useful when formatting
    * the message.
    */
    static formatMessage = defaultFormatMessage;
    /**
    * The raw list of errors returned by the top-level `errors` field in the
    * multipart HTTP subscription response.
    */
    errors;
    constructor(protocolErrors) {
        super(CombinedProtocolErrors.formatMessage(protocolErrors, {
            defaultFormatMessage,
        }));
        this.name = "CombinedProtocolErrors";
        this.errors = protocolErrors;
        brand(this);
        Object.setPrototypeOf(this, CombinedProtocolErrors.prototype);
    }
}
//# sourceMappingURL=CombinedProtocolErrors.js.map
