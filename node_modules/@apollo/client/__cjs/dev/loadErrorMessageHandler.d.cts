import type { ErrorCodes } from "../invariantErrorCodes.cjs";
import type { ErrorMessageHandler } from "./setErrorMessageHandler.cjs";
/**
 * Injects Apollo Client's default error message handler into the application and
 * also loads the error codes that are passed in as arguments.
 */
export declare function loadErrorMessageHandler(...errorCodes: ErrorCodes[]): ErrorMessageHandler & ErrorCodes;
//# sourceMappingURL=loadErrorMessageHandler.d.cts.map
