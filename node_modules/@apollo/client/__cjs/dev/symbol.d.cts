import type { ErrorCodes } from "../invariantErrorCodes.cjs";
export declare const ApolloErrorMessageHandler: unique symbol;
declare global {
    interface Window {
        [ApolloErrorMessageHandler]?: {
            (message: string | number, args: string[]): string | undefined;
        } & ErrorCodes;
    }
}
//# sourceMappingURL=symbol.d.cts.map
