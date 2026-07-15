/**
* @internal
* Used to set `extensions` on the GraphQL result without exposing it
* unnecessarily. Only use internally!
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare const extensionsSymbol: unique symbol;
/**
 * For use in Cache implementations only.
 * This should not be used in userland code.
 */
export declare const streamInfoSymbol: unique symbol;
/**
* @internal
* Used as key for `ApolloClient.WatchQueryOptions`.
*
* Meant for framework integrators only!
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare const variablesUnknownSymbol: unique symbol;
//# sourceMappingURL=constants.d.cts.map
