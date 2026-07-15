import * as React from "react";
import { ApolloClient } from "@apollo/client";
import type { ApolloCache } from "@apollo/client/cache";
import type { ApolloLink } from "@apollo/client/link";
import type { LocalState } from "@apollo/client/local-state";
import { MockLink } from "@apollo/client/testing";
export interface MockedProviderProps {
    mocks?: ReadonlyArray<MockLink.MockedResponse<any, any>>;
    defaultOptions?: ApolloClient.DefaultOptions;
    cache?: ApolloCache;
    localState?: LocalState;
    childProps?: object;
    children?: any;
    link?: ApolloLink;
    showWarnings?: boolean;
    mockLinkDefaultOptions?: MockLink.DefaultOptions;
    /**
     * Configuration used by the [Apollo Client Devtools extension](https://www.apollographql.com/docs/react/development-testing/developer-tooling/#apollo-client-devtools) for this client.
     *
     * @since 3.14.0
     */
    devtools?: ApolloClient.Options["devtools"];
}
interface MockedProviderState {
    client: ApolloClient;
}
export declare class MockedProvider extends React.Component<MockedProviderProps, MockedProviderState> {
    constructor(props: MockedProviderProps);
    render(): React.JSX.Element | null;
    componentWillUnmount(): void;
}
export {};
//# sourceMappingURL=MockedProvider.d.cts.map
