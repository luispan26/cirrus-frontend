import { ApolloClient, HttpLink, InMemoryCache, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getAuthToken } from './lib/auth-storage';

export const CIRRUS_API_BASE_URL =
  (import.meta.env.VITE_CIRRUS_API_BASE_URL as string) || 'http://localhost:4000';
export const GRAPHQL_HTTP_URL = `${CIRRUS_API_BASE_URL}/graphql`;
export const GRAPHQL_WS_URL = `${CIRRUS_API_BASE_URL.replace(/^http/, 'ws')}/graphql`;
export const CHAT_STREAM_URL = `${CIRRUS_API_BASE_URL}/chat/stream`;

const httpLink = new HttpLink({ uri: GRAPHQL_HTTP_URL });

const authLink = setContext((_, { headers }) => {
  const token = getAuthToken();
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: GRAPHQL_WS_URL,
  }),
);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
  },
  wsLink,
  authLink.concat(httpLink),
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});