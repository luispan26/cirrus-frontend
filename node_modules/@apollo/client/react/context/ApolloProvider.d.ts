import type * as ReactTypes from "react";
import type { ApolloClient } from "@apollo/client";
export declare namespace ApolloProvider {
    interface Props {
        client: ApolloClient;
        children: ReactTypes.ReactNode | ReactTypes.ReactNode[] | null;
    }
}
export declare const ApolloProvider: ReactTypes.FC<ApolloProvider.Props>;
//# sourceMappingURL=ApolloProvider.d.ts.map