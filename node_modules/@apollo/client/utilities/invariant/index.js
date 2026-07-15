import { __DEV__ } from "@apollo/client/utilities/environment";
import { global } from "@apollo/client/utilities/internal/globals";
import { version } from "../../version.js";
// eslint-disable-next-line local-rules/import-from-inside-other-export
import { stringifyForDisplay } from "../internal/stringifyForDisplay.js";
const genericMessage = "Invariant Violation";
export class InvariantError extends Error {
    constructor(message = genericMessage) {
        super(message);
        this.name = genericMessage;
        Object.setPrototypeOf(this, InvariantError.prototype);
    }
}
const verbosityLevels = ["debug", "log", "warn", "error", "silent"];
let verbosityLevel = verbosityLevels.indexOf(__DEV__ ? "log" : "silent");
export function invariant(condition, ...args) {
    if (!condition) {
        throw newInvariantError(...args);
    }
}
function wrapConsoleMethod(name) {
    return function (message, ...args) {
        if (verbosityLevels.indexOf(name) >= verbosityLevel) {
            // Default to console.log if this host environment happens not to provide
            // all the console.* methods we need.
            const method = console[name] || console.log;
            if (typeof message === "number") {
                const arg0 = message;
                message = getHandledErrorMsg(arg0);
                if (!message) {
                    message = getFallbackErrorMsg(arg0, args);
                    args = [];
                }
            }
            method(message, ...args);
        }
    };
}
invariant.debug = wrapConsoleMethod("debug");
invariant.log = wrapConsoleMethod("log");
invariant.warn = wrapConsoleMethod("warn");
invariant.error = wrapConsoleMethod("error");
export function setVerbosity(level) {
    const old = verbosityLevels[verbosityLevel];
    verbosityLevel = Math.max(0, verbosityLevels.indexOf(level));
    return old;
}
/**
 * Returns an InvariantError.
 *
 * `message` can only be a string, a concatenation of strings, or a ternary statement
 * that results in a string. This will be enforced on build, where the message will
 * be replaced with a message number.
 * String substitutions with %s are supported and will also return
 * pretty-stringified objects.
 * Excess `optionalParams` will be swallowed.
 */
export function newInvariantError(message, ...optionalParams) {
    return new InvariantError(getHandledErrorMsg(message, optionalParams) ||
        getFallbackErrorMsg(message, optionalParams));
}
// This is duplicated between `@apollo/client/dev` and `@apollo/client/utilities/invariant` to prevent circular references.
export const ApolloErrorMessageHandler = Symbol.for("ApolloErrorMessageHandler_" + version);
function stringify(arg) {
    if (typeof arg == "string") {
        return arg;
    }
    try {
        return stringifyForDisplay(arg, 2).slice(0, 1000);
    }
    catch {
        return "<non-serializable>";
    }
}
function getHandledErrorMsg(message, messageArgs = []) {
    if (!message)
        return;
    return (global[ApolloErrorMessageHandler] &&
        global[ApolloErrorMessageHandler](message, messageArgs.map(stringify)));
}
function getFallbackErrorMsg(message, messageArgs = []) {
    if (!message)
        return;
    if (typeof message === "string") {
        return messageArgs.reduce((msg, arg) => msg.replace(/%[sdfo]/, stringify(arg)), message);
    }
    return `An error occurred! For more details, see the full error text at https://go.apollo.dev/c/err#${encodeURIComponent(JSON.stringify({
        version,
        message,
        args: messageArgs.map(stringify),
    }))}`;
}
//# sourceMappingURL=index.js.map