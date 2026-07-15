import * as React from "react";
import { ApolloClient } from "@apollo/client";
import { InMemoryCache as Cache } from "@apollo/client/cache";
import { ApolloProvider } from "@apollo/client/react";
import { MockLink } from "@apollo/client/testing";
export class MockedProvider extends React.Component {
    constructor(props) {
        super(props);
        const { mocks, defaultOptions, cache, localState, link, showWarnings, mockLinkDefaultOptions, devtools, } = this.props;
        const client = new ApolloClient({
            cache: cache || new Cache(),
            defaultOptions,
            link: link ||
                new MockLink(mocks || [], {
                    showWarnings,
                    defaultOptions: mockLinkDefaultOptions,
                }),
            localState,
            devtools,
        });
        this.state = {
            client,
        };
    }
    render() {
        const { children, childProps } = this.props;
        const { client } = this.state;
        return React.isValidElement(children) ?
            React.createElement(ApolloProvider, { client: client }, React.cloneElement(React.Children.only(children), { ...childProps }))
            : null;
    }
    componentWillUnmount() {
        // Since this.state.client was created in the constructor, it's this
        // MockedProvider's responsibility to terminate it.
        this.state.client.stop();
    }
}
//# sourceMappingURL=MockedProvider.js.map