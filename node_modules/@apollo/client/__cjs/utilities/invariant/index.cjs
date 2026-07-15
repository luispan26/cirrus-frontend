"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApolloErrorMessageHandler = exports.InvariantError = void 0;
exports.invariant = invariant;
exports.setVerbosity = setVerbosity;
exports.newInvariantError = newInvariantError;
const environment_1 = require("@apollo/client/utilities/environment");
const globals_1 = require("@apollo/client/utilities/internal/globals");
const version_js_1 = require("../../version.cjs");
// eslint-disable-next-line local-rules/import-from-inside-other-export
const stringifyForDisplay_js_1 = require("../internal/stringifyForDisplay.cjs");
const genericMessage = "Invariant Violation";
class InvariantError extends Error {
    constructor(message = genericMessage) {
        super(message);
        this.name = genericMessage;
        Object.setPrototypeOf(this, InvariantError.prototype);
    }
}
exports.InvariantError = InvariantError;
const verbosityLevels = ["debug", "log", "warn", "error", "silent"];
let verbosityLevel = verbosityLevels.indexOf(environment_1.__DEV__ ? "log" : "silent");
function invariant(condition, ...args) {
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
function setVerbosity(level) {
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
function newInvariantError(message, ...optionalParams) {
    return new InvariantError(getHandledErrorMsg(message, optionalParams) ||
        getFallbackErrorMsg(message, optionalParams));
}
// This is duplicated between `@apollo/client/dev` and `@apollo/client/utilities/invariant` to prevent circular references.
exports.ApolloErrorMessageHandler = Symbol.for("ApolloErrorMessageHandler_" + version_js_1.version);
function stringify(arg) {
    if (typeof arg == "string") {
        return arg;
    }
    try {
        return (0, stringifyForDisplay_js_1.stringifyForDisplay)(arg, 2).slice(0, 1000);
    }
    catch {
        return "<non-serializable>";
    }
}
function getHandledErrorMsg(message, messageArgs = []) {
    if (!message)
        return;
    return (globals_1.global[exports.ApolloErrorMessageHandler] &&
        globals_1.global[exports.ApolloErrorMessageHandler](message, messageArgs.map(stringify)));
}
function getFallbackErrorMsg(message, messageArgs = []) {
    if (!message)
        return;
    if (typeof message === "string") {
        return messageArgs.reduce((msg, arg) => msg.replace(/%[sdfo]/, stringify(arg)), message);
    }
    return `An error occurred! For more details, see the full error text at https://go.apollo.dev/c/err#${encodeURIComponent(JSON.stringify({
        version: version_js_1.version,
        message,
        args: messageArgs.map(stringify),
    }))}`;
}
//# sourceMappingURL=index.cjs.map
