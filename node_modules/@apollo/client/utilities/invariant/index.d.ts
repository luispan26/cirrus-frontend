import type { ErrorCodes } from "../../invariantErrorCodes.js";
export declare class InvariantError extends Error {
    constructor(message?: string);
}
declare const verbosityLevels: readonly ["debug", "log", "warn", "error", "silent"];
type VerbosityLevel = (typeof verbosityLevels)[number];
export declare function invariant(condition: any, ...args: [message?: string | number, ...any[]]): asserts condition;
export declare namespace invariant {
    var debug: {
        (...data: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
    };
    var log: {
        (...data: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
    };
    var warn: {
        (...data: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
    };
    var error: {
        (...data: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
    };
}
export declare function setVerbosity(level: VerbosityLevel): VerbosityLevel;
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
export declare function newInvariantError(message?: string | number, ...optionalParams: unknown[]): InvariantError;
export declare const ApolloErrorMessageHandler: unique symbol;
declare global {
    interface Window {
        [ApolloErrorMessageHandler]?: {
            (message: string | number, args: string[]): string | undefined;
        } & ErrorCodes;
    }
}
export {};
//# sourceMappingURL=index.d.ts.map