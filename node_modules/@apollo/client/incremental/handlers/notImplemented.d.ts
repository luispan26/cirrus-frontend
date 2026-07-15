import type { ApolloLink } from "@apollo/client/link";
import type { HKT } from "@apollo/client/utilities";
import type { Incremental } from "../types.js";
export declare namespace NotImplementedHandler {
    interface NotImplementedResult extends HKT {
        arg1: unknown;
        arg2: unknown;
        return: never;
    }
    interface TypeOverrides {
        AdditionalApolloLinkResultTypes: NotImplementedResult;
    }
}
export declare class NotImplementedHandler implements Incremental.Handler<never> {
    isIncrementalResult(_: any): _ is never;
    prepareRequest(request: ApolloLink.Request): ApolloLink.Request;
    extractErrors(): void;
    startRequest: any;
}
//# sourceMappingURL=notImplemented.d.ts.map