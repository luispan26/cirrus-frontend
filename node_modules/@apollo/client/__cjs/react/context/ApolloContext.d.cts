import type * as ReactTypes from "react";
import type { ApolloClient } from "@apollo/client";
import type { HookWrappers, wrapperSymbol } from "@apollo/client/react/internal";
export interface ApolloContextValue {
    client?: ApolloClient;
    [wrapperSymbol]?: HookWrappers;
}
export declare function getApolloContext(): ReactTypes.Context<ApolloContextValue>;
//# sourceMappingURL=ApolloContext.d.cts.map
