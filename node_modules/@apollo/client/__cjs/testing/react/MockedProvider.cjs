"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockedProvider = void 0;
const tslib_1 = require("tslib");
const React = tslib_1.__importStar(require("react"));
const client_1 = require("@apollo/client");
const cache_1 = require("@apollo/client/cache");
const react_1 = require("@apollo/client/react");
const testing_1 = require("@apollo/client/testing");
class MockedProvider extends React.Component {
    constructor(props) {
        super(props);
        const { mocks, defaultOptions, cache, localState, link, showWarnings, mockLinkDefaultOptions, devtools, } = this.props;
        const client = new client_1.ApolloClient({
            cache: cache || new cache_1.InMemoryCache(),
            defaultOptions,
            link: link ||
                new testing_1.MockLink(mocks || [], {
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
            React.createElement(react_1.ApolloProvider, { client: client }, React.cloneElement(React.Children.only(children), { ...childProps }))
            : null;
    }
    componentWillUnmount() {
        // Since this.state.client was created in the constructor, it's this
        // MockedProvider's responsibility to terminate it.
        this.state.client.stop();
    }
}
exports.MockedProvider = MockedProvider;
//# sourceMappingURL=MockedProvider.cjs.map
