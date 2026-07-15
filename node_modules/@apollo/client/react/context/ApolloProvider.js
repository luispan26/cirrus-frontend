import * as React from "react";
import { invariant } from "@apollo/client/utilities/invariant";
import { getApolloContext } from "./ApolloContext.js";
export const ApolloProvider = ({ client, children, }) => {
    const ApolloContext = getApolloContext();
    const parentContext = React.useContext(ApolloContext);
    const context = React.useMemo(() => {
        return {
            ...parentContext,
            client: client || parentContext.client,
        };
    }, [parentContext, client]);
    invariant(context.client, 38);
    return (React.createElement(ApolloContext.Provider, { value: context }, children));
};
//# sourceMappingURL=ApolloProvider.js.map
