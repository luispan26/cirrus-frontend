"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStateError = void 0;
const utils_js_1 = require("./utils.cjs");
/**
 * Represents a fatal error when executing `@client` fields from `LocalState`,
 * typically to indicate a problem with the `LocalState` configuration or
 * incorrect usage of a resolver function. This error does not represent user
 * errors thrown in a local resolver when resolving `@client` fields.
 *
 * @example
 *
 * ```ts
 * import { LocalStateError } from "@apollo/client/errors";
 *
 * // Check if an error is a LocalStateError instance
 * if (LocalStateError.is(error)) {
 *   console.log("Original error:", error.cause);
 *
 *   // Determine which field caused the error
 *   if (error.path) {
 *     console.log("Error occurred at field path:", error.path.join("."));
 *   }
 * }
 * ```
 */
class LocalStateError extends Error {
    /**
     * A method that determines whether an error is a `LocalStateError`
     * object. This method enables TypeScript to narrow the error type.
     *
     * @example
     *
     * ```ts
     * if (LocalStateError.is(error)) {
     *   // TypeScript now knows `error` is a LocalStateError object
     *   console.log(error.path);
     * }
     * ```
     */
    static is(error) {
        return (0, utils_js_1.isBranded)(error, "LocalStateError");
    }
    /**
    * The path to the field that caused the error.
    */
    path;
    constructor(message, options = {}) {
        super(message, { cause: options.sourceError });
        this.name = "LocalStateError";
        this.path = options.path;
        (0, utils_js_1.brand)(this);
        Object.setPrototypeOf(this, LocalStateError.prototype);
    }
}
exports.LocalStateError = LocalStateError;
//# sourceMappingURL=LocalStateError.cjs.map
