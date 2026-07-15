import { brand, isBranded } from "./utils.js";
function defaultFormatMessage(errors) {
    return (errors
        // Handle non-spec-compliant servers: See #1185
        .filter((e) => e)
        .map((e) => e.message || "Error message not found.")
        .join("\n"));
}
/**
 * Represents the combined list of GraphQL errors returned from the server in a
 * GraphQL response. This error type is used when your GraphQL operation returns
 * errors in the `errors` field of the response.
 *
 * @remarks
 *
 * When your GraphQL operation encounters errors on the server side (such as
 * resolver errors, validation errors, or syntax errors), the server returns
 * these errors in the `errors` array of the GraphQL response. Apollo Client
 * wraps these errors in a `CombinedGraphQLErrors` object, which provides access
 * to the individual errors while maintaining additional context about the
 * response.
 *
 * @example
 *
 * ```ts
 * import { CombinedGraphQLErrors } from "@apollo/client/errors";
 *
 * // Check if an error is a CombinedGraphQLErrors object
 * if (CombinedGraphQLErrors.is(error)) {
 *   // Access individual GraphQL errors
 *   error.errors.forEach((graphQLError) => {
 *     console.log(graphQLError.message);
 *     console.log(graphQLError.path);
 *     console.log(graphQLError.locations);
 *   });
 *
 *   // Access the original GraphQL result
 *   console.log(error.result);
 * }
 * ```
 */
export class CombinedGraphQLErrors extends Error {
    /**
    * A method that determines whether an error is a `CombinedGraphQLErrors`
    * object. This method enables TypeScript to narrow the error type.
    * 
    * @example
    * 
    * ```ts
    * if (CombinedGraphQLErrors.is(error)) {
    *   // TypeScript now knows `error` is a `CombinedGraphQLErrors` object
    *   console.log(error.errors);
    * }
    * ```
    */
    static is(error) {
        return isBranded(error, "CombinedGraphQLErrors");
    }
    /**
    * A function that formats the error message used for the error's `message`
    * property. Override this method to provide your own formatting.
    * 
    * @remarks
    * 
    * The `formatMessage` function is called by the `CombinedGraphQLErrors`
    * constructor to provide a formatted message as the `message` property of the
    * `CombinedGraphQLErrors` object. Follow the ["Providing a custom message
    * formatter"](https://www.apollographql.com/docs/react/api/errors/CombinedGraphQLErrors#providing-a-custom-message-formatter) guide to learn how to modify the message format.
    * 
    * @param errors - The array of GraphQL errors returned from the server in
    * the `errors` field of the response.
    * @param options - Additional context that could be useful when formatting
    * the message.
    */
    static formatMessage = defaultFormatMessage;
    /**
    * The raw list of GraphQL errors returned by the `errors` field in the GraphQL response.
    */
    errors;
    /**
    * Partial data returned in the `data` field of the GraphQL response.
    */
    data;
    /**
    * Extensions returned by the `extensions` field in the GraphQL response.
    */
    extensions;
    constructor(result, errors = result.errors || []) {
        super(CombinedGraphQLErrors.formatMessage(errors, {
            result,
            defaultFormatMessage,
        }));
        this.errors = errors;
        this.data = result.data;
        this.extensions = result.extensions;
        this.name = "CombinedGraphQLErrors";
        brand(this);
        Object.setPrototypeOf(this, CombinedGraphQLErrors.prototype);
    }
}
//# sourceMappingURL=CombinedGraphQLErrors.js.map
