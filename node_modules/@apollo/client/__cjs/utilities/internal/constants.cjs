"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.variablesUnknownSymbol = exports.streamInfoSymbol = exports.extensionsSymbol = void 0;
/**
* @internal
* Used to set `extensions` on the GraphQL result without exposing it
* unnecessarily. Only use internally!
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
exports.extensionsSymbol = Symbol.for("apollo.result.extensions");
/**
 * For use in Cache implementations only.
 * This should not be used in userland code.
 */
exports.streamInfoSymbol = Symbol.for("apollo.result.streamInfo");
/**
* @internal
* Used as key for `ApolloClient.WatchQueryOptions`.
*
* Meant for framework integrators only!
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
exports.variablesUnknownSymbol = Symbol.for("apollo.observableQuery.variablesUnknown");
//# sourceMappingURL=constants.cjs.map
