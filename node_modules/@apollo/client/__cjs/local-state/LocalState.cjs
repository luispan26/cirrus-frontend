"use strict";;
const {
    __DEV__
} = require("@apollo/client/utilities/environment");

Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalState = void 0;
const graphql_1 = require("graphql");
const cache_1 = require("@apollo/client/cache");
const errors_1 = require("@apollo/client/errors");
const utilities_1 = require("@apollo/client/utilities");
const environment_1 = require("@apollo/client/utilities/environment");
const internal_1 = require("@apollo/client/utilities/internal");
const invariant_1 = require("@apollo/client/utilities/invariant");
/**
 * LocalState enables the use of `@client` fields in GraphQL operations.
 *
 * `@client` fields are resolved locally using resolver functions rather than
 * being sent to the GraphQL server. This allows you to mix local and remote
 * data in a single query.
 *
 * @example
 *
 * ```ts
 * import { LocalState } from "@apollo/client/local-state";
 *
 * const localState = new LocalState({
 *   resolvers: {
 *     Query: {
 *       isLoggedIn: () => !!localStorage.getItem("token"),
 *     },
 *   },
 * });
 *
 * const client = new ApolloClient({
 *   cache: new InMemoryCache(),
 *   localState,
 * });
 * ```
 *
 * @template TResolvers - The type of resolvers map for type checking
 * @template TContext - The type of context value for resolvers
 */
class LocalState {
    context;
    resolvers = {};
    traverseCache = new WeakMap();
    constructor(...[options]) {
        this.context = options?.context;
        if (options?.resolvers) {
            this.addResolvers(options.resolvers);
        }
    }
    /**
     * Add resolvers to the local state. New resolvers will be merged with
     * existing ones, with new resolvers taking precedence over existing ones
     * for the same field.
     *
     * @param resolvers - The resolvers to add
     *
     * @example
     *
     * ```ts
     * localState.addResolvers({
     *   Query: {
     *     newField: () => "Hello World",
     *   },
     * });
     * ```
     */
    addResolvers(resolvers) {
        this.resolvers = (0, internal_1.mergeDeep)(this.resolvers, resolvers);
    }
    async execute({ document, client, context, remoteResult, variables = {}, onlyRunForcedResolvers = false, returnPartialData = false, fetchPolicy, }) {
        if (environment_1.__DEV__) {
            (0, invariant_1.invariant)((0, internal_1.hasDirectives)(["client"], document), 47);
            validateCacheImplementation(client.cache);
        }
        // note: if `remoteResult` is `undefined`, we will execute resolvers since
        // undefined remote data reflects a client-only query. We specifically want
        // to avoid trying to run local resolvers if the server returned `data` as
        // `null`.
        if (remoteResult?.data === null) {
            return remoteResult;
        }
        const { selectionsToResolve, exportedVariableDefs, operationDefinition, fragmentMap, } = this.collectQueryDetail(document);
        const rootValue = remoteResult ? remoteResult.data : {};
        const diff = fetchPolicy === "no-cache" ?
            { result: null, complete: false }
            : client.cache.diff({
                query: toQueryOperation(document),
                variables,
                returnPartialData: true,
                optimistic: false,
            });
        const requestContext = { ...client.defaultContext, ...context };
        const execContext = {
            client,
            operationDefinition,
            fragmentMap,
            context: this.context?.({
                requestContext,
                document,
                client,
                phase: "resolve",
                variables: variables ?? {},
            }) ?? requestContext,
            variables,
            exportedVariables: {},
            selectionsToResolve,
            onlyRunForcedResolvers,
            errors: [],
            phase: "resolve",
            exportedVariableDefs,
            diff,
            returnPartialData,
            fetchPolicy,
        };
        const localResult = await this.resolveSelectionSet(operationDefinition.selectionSet, false, rootValue, execContext, []);
        const errors = (remoteResult?.errors ?? []).concat(execContext.errors);
        const result = {
            ...remoteResult,
            data: (0, internal_1.mergeDeep)(rootValue, localResult),
        };
        if (errors.length > 0) {
            result.errors = errors;
        }
        return result;
    }
    async getExportedVariables({ document, client, context, variables, }) {
        if (environment_1.__DEV__) {
            (0, invariant_1.invariant)((0, internal_1.hasDirectives)(["client"], document), 48);
            validateCacheImplementation(client.cache);
        }
        const { exportsToResolve, exportedVariableDefs, fragmentMap, operationDefinition, } = this.collectQueryDetail(document);
        const diff = client.cache.diff({
            query: toQueryOperation(document),
            variables,
            returnPartialData: true,
            optimistic: false,
        });
        const requestContext = { ...client.defaultContext, ...context };
        const execContext = {
            client,
            operationDefinition,
            fragmentMap,
            context: this.context?.({
                requestContext,
                document,
                client,
                phase: "resolve",
                variables: variables ?? {},
            }) ?? requestContext,
            variables,
            exportedVariables: {},
            selectionsToResolve: exportsToResolve,
            onlyRunForcedResolvers: false,
            errors: [],
            phase: "exports",
            exportedVariableDefs,
            diff,
            returnPartialData: false,
        };
        await this.resolveSelectionSet(operationDefinition.selectionSet, false, diff.result, execContext, []);
        return (0, utilities_1.stripTypename)({
            ...variables,
            ...execContext.exportedVariables,
        });
    }
    async resolveSelectionSet(selectionSet, isClientFieldDescendant, rootValue, execContext, path) {
        const { client, fragmentMap, variables, operationDefinition } = execContext;
        const { cache } = client;
        const resultsToMerge = [];
        const execute = async (selection) => {
            if (!isClientFieldDescendant &&
                !execContext.selectionsToResolve.has(selection)) {
                // Skip selections without @client directives
                // (still processing if one of the ancestors or one of the child fields has @client directive)
                return;
            }
            if (!(0, internal_1.shouldInclude)(selection, variables)) {
                // Skip this entirely.
                return;
            }
            if (selection.kind === graphql_1.Kind.FIELD) {
                const isRootField = selectionSet === operationDefinition.selectionSet;
                const isClientField = isClientFieldDescendant ||
                    (selection.directives?.some((d) => d.name.value === "client") ??
                        false);
                const fieldResult = isClientField ?
                    await this.resolveClientField(selection, isClientFieldDescendant, rootValue, execContext, selectionSet, path.concat(selection.name.value))
                    : await this.resolveServerField(selection, rootValue, execContext, path.concat(selection.name.value));
                // Don't attempt to merge the client field result if the server result
                // was null
                if (fieldResult !== undefined && (!isRootField || rootValue !== null)) {
                    resultsToMerge.push({
                        [(0, internal_1.resultKeyNameFromField)(selection)]: fieldResult,
                    });
                }
                return;
            }
            if (selection.kind === graphql_1.Kind.INLINE_FRAGMENT &&
                selection.typeCondition &&
                rootValue?.__typename &&
                cache.fragmentMatches(selection, rootValue.__typename)) {
                const fragmentResult = await this.resolveSelectionSet(selection.selectionSet, isClientFieldDescendant, rootValue, execContext, path);
                if (fragmentResult) {
                    resultsToMerge.push(fragmentResult);
                }
                return;
            }
            if (selection.kind === graphql_1.Kind.FRAGMENT_SPREAD) {
                const fragment = fragmentMap[selection.name.value];
                (0, invariant_1.invariant)(fragment, 49, selection.name.value);
                const typename = rootValue?.__typename;
                const typeCondition = fragment.typeCondition.name.value;
                const matches = typename === typeCondition ||
                    cache.fragmentMatches(fragment, typename ?? "");
                if (matches) {
                    const fragmentResult = await this.resolveSelectionSet(fragment.selectionSet, isClientFieldDescendant, rootValue, execContext, path);
                    if (fragmentResult) {
                        resultsToMerge.push(fragmentResult);
                    }
                }
                return;
            }
        };
        await Promise.all(selectionSet.selections.map(execute));
        return resultsToMerge.length > 0 ?
            (0, internal_1.mergeDeepArray)(resultsToMerge)
            : rootValue;
    }
    resolveServerField(field, rootValue, execContext, path) {
        const result = rootValue?.[(0, internal_1.resultKeyNameFromField)(field)];
        if (!field.selectionSet) {
            return result;
        }
        if (result == null) {
            if (execContext.phase === "exports") {
                for (const [name, def] of Object.entries(execContext.exportedVariableDefs)) {
                    if (def.ancestors.has(field) && def.required) {
                        throw new errors_1.LocalStateError(`${"Field"} '${field.name.value}' is \`${result}\` which contains exported required variable '${name}'. Ensure this value is in the cache or make the variable optional.`, { path });
                    }
                }
            }
            return result;
        }
        if (Array.isArray(result)) {
            return this.resolveSubSelectedArray(field, false, result, execContext, path);
        }
        return this.resolveSelectionSet(field.selectionSet, false, result, execContext, path);
    }
    async resolveClientField(field, isClientFieldDescendant, rootValue, execContext, parentSelectionSet, path) {
        const { client, diff, variables, operationDefinition, phase, onlyRunForcedResolvers, fetchPolicy, } = execContext;
        let { returnPartialData } = execContext;
        const isRootField = parentSelectionSet === operationDefinition.selectionSet;
        const fieldName = field.name.value;
        const typename = isRootField ?
            rootValue?.__typename || inferRootTypename(operationDefinition)
            : rootValue?.__typename;
        const resolverName = `${typename}.${fieldName}`;
        function readField() {
            const fieldResult = rootValue?.[fieldName];
            if (fieldResult !== undefined) {
                return fieldResult;
            }
            return getCacheResultAtPath(diff, path);
        }
        const defaultResolver = isClientFieldDescendant ? readField
            // We expect a resolver to be defined for all `@client` root fields.
            // Warn when a resolver is not defined.
            : (() => {
                const fieldFromCache = getCacheResultAtPath(diff, path);
                if (fieldFromCache !== undefined) {
                    return fieldFromCache;
                }
                if (client.cache.resolvesClientField?.(typename, fieldName)) {
                    if (fetchPolicy === "no-cache") {
                        __DEV__ && invariant_1.invariant.warn(50, resolverName);
                        return null;
                    }
                    // assume the cache will handle returning the correct value
                    returnPartialData = true;
                    return;
                }
                if (!returnPartialData) {
                    __DEV__ && invariant_1.invariant.warn(51, resolverName);
                    return null;
                }
            });
        const resolver = this.getResolver(typename, fieldName);
        let result;
        try {
            // Avoid running the resolver if we are only trying to run forced
            // resolvers. Fallback to read the value from the root field or the cache
            // value
            if (!onlyRunForcedResolvers || isForcedResolver(field)) {
                result =
                    resolver ?
                        await Promise.resolve(
                        // In case the resolve function accesses reactive variables,
                        // set cacheSlot to the current cache instance.
                        cache_1.cacheSlot.withValue(client.cache, resolver, [
                            rootValue ? (0, internal_1.dealias)(rootValue, parentSelectionSet) : {},
                            ((0, internal_1.argumentsObjectFromField)(field, variables) ?? {}),
                            { requestContext: execContext.context, client, phase },
                            { field, fragmentMap: execContext.fragmentMap, path },
                        ]))
                        : defaultResolver();
            }
            else {
                result = readField();
            }
        }
        catch (e) {
            if (phase === "exports") {
                for (const [name, def] of Object.entries(execContext.exportedVariableDefs)) {
                    if (def.ancestors.has(field)) {
                        throw new errors_1.LocalStateError(`An error was thrown from resolver '${resolverName}' while resolving ${def.required ? "required" : "optional"} variable '${name}'. Use a try/catch and return \`undefined\` to suppress this error and omit the variable from the request.`, { path, sourceError: e });
                    }
                }
            }
            this.addError((0, errors_1.toErrorLike)(e), path, execContext, {
                resolver: resolverName,
                cause: e,
            });
            return null;
        }
        if (phase === "exports") {
            field.directives?.forEach((directive) => {
                if (directive.name.value !== "export") {
                    return;
                }
                const name = getExportedVariableName(directive);
                if (!name) {
                    return;
                }
                if (result !== undefined) {
                    execContext.exportedVariables[name] = result;
                }
            });
            if (result == null) {
                for (const [name, def] of Object.entries(execContext.exportedVariableDefs)) {
                    if (def.ancestors.has(field) && def.required) {
                        throw new errors_1.LocalStateError(`${resolver ? "Resolver" : "Field"} '${resolverName}' returned \`${result}\` ${def.field === field ? "for" : "which contains exported"} required variable '${name}'.`, { path });
                    }
                }
            }
        }
        if (result === undefined && !returnPartialData) {
            if (environment_1.__DEV__ && phase === "resolve") {
                if (resolver && !onlyRunForcedResolvers) {
                    __DEV__ && invariant_1.invariant.warn(52, resolverName);
                }
                else if (onlyRunForcedResolvers) {
                    __DEV__ && invariant_1.invariant.warn(53, resolverName);
                }
                else {
                    __DEV__ && invariant_1.invariant.warn(54, fieldName, rootValue);
                }
            }
            result = null;
        }
        if (result == null || !field.selectionSet) {
            return result;
        }
        if (Array.isArray(result)) {
            return this.resolveSubSelectedArray(field, true, result, execContext, path);
        }
        if (phase === "resolve" && !result.__typename) {
            this.addError((0, invariant_1.newInvariantError)(55, result, resolverName), path, execContext, { resolver: resolverName });
            return null;
        }
        return this.resolveSelectionSet(field.selectionSet, true, result, execContext, path);
    }
    addError(error, path, execContext, meta) {
        execContext.errors.push(addExtension(isGraphQLError(error) ?
            { ...error.toJSON(), path }
            : { message: error.message, path }, meta));
    }
    getResolver(typename, fieldName) {
        return this.resolvers[typename]?.[fieldName];
    }
    resolveSubSelectedArray(field, isClientFieldDescendant, result, execContext, path) {
        return Promise.all(result.map((item, idx) => {
            if (item === null) {
                return null;
            }
            // This is a nested array, recurse.
            if (Array.isArray(item)) {
                return this.resolveSubSelectedArray(field, isClientFieldDescendant, item, execContext, path.concat(idx));
            }
            // This is an object, run the selection set on it.
            if (field.selectionSet) {
                return this.resolveSelectionSet(field.selectionSet, isClientFieldDescendant, item, execContext, path.concat(idx));
            }
        }));
    }
    // Collect selection nodes on paths from document root down to all @client directives.
    // This function takes into account transitive fragment spreads.
    // Complexity equals to a single `visit` over the full document.
    collectQueryDetail(document) {
        const operationDefinition = (0, internal_1.getMainDefinition)(document);
        const fragments = (0, internal_1.getFragmentDefinitions)(document);
        const fragmentMap = (0, internal_1.createFragmentMap)(fragments);
        const isSingleASTNode = (node) => !Array.isArray(node);
        const fields = [];
        let rootClientField;
        function getCurrentPath() {
            return fields.map((field) => field.name.value);
        }
        const traverse = (definitionNode) => {
            if (this.traverseCache.has(definitionNode)) {
                return this.traverseCache.get(definitionNode);
            }
            // Track a separate list of all variable definitions since not all variable
            // definitions are used as exports of an `@export` field.
            const allVariableDefinitions = {};
            const cache = {
                exportedVariableDefs: {},
                exportsToResolve: new Set(),
                selectionsToResolve: new Set(),
            };
            this.traverseCache.set(definitionNode, cache);
            (0, graphql_1.visit)(definitionNode, {
                VariableDefinition: (definition) => {
                    allVariableDefinitions[definition.variable.name.value] = {
                        required: definition.type.kind === graphql_1.Kind.NON_NULL_TYPE,
                        ancestors: new WeakSet(),
                    };
                },
                Field: {
                    enter(field) {
                        fields.push(field);
                    },
                    leave() {
                        const removed = fields.pop();
                        if (removed === rootClientField) {
                            rootClientField = undefined;
                        }
                    },
                },
                Directive(node, _, __, ___, ancestors) {
                    const field = fields.at(-1);
                    if (!field) {
                        return;
                    }
                    if (node.name.value === "export" &&
                        // Ignore export directives that aren't inside client fields.
                        // These will get sent to the server
                        rootClientField) {
                        const fieldName = field.name.value;
                        const variableName = getExportedVariableName(node);
                        if (!variableName) {
                            throw new errors_1.LocalStateError(`Cannot determine the variable name from the \`@export\` directive used on field '${fieldName}'. Perhaps you forgot the \`as\` argument?`, { path: getCurrentPath() });
                        }
                        if (!allVariableDefinitions[variableName]) {
                            throw new errors_1.LocalStateError(`\`@export\` directive on field '${fieldName}' cannot export the '$${variableName}' variable as it is missing in the ${operationDefinition.operation} definition.`, { path: getCurrentPath() });
                        }
                        cache.exportedVariableDefs[variableName] = {
                            ...allVariableDefinitions[variableName],
                            field,
                        };
                        ancestors.forEach((node) => {
                            if (isSingleASTNode(node) && (0, graphql_1.isSelectionNode)(node)) {
                                cache.exportsToResolve.add(node);
                                cache.exportedVariableDefs[variableName].ancestors.add(node);
                            }
                        });
                    }
                    if (node.name.value === "client") {
                        rootClientField ??= field;
                        ancestors.forEach((node) => {
                            if (isSingleASTNode(node) && (0, graphql_1.isSelectionNode)(node)) {
                                cache.selectionsToResolve.add(node);
                            }
                        });
                    }
                },
                FragmentSpread(spread, _, __, ___, ancestors) {
                    const fragment = fragmentMap[spread.name.value];
                    (0, invariant_1.invariant)(fragment, 56, spread.name.value);
                    const { selectionsToResolve: fragmentSelections } = traverse(fragment);
                    if (fragmentSelections.size > 0) {
                        // Fragment for this spread contains @client directive (either directly or transitively)
                        // Collect selection nodes on paths from the root down to fields with the @client directive
                        ancestors.forEach((node) => {
                            if (isSingleASTNode(node) && (0, graphql_1.isSelectionNode)(node)) {
                                cache.selectionsToResolve.add(node);
                            }
                        });
                        cache.selectionsToResolve.add(spread);
                        fragmentSelections.forEach((selection) => {
                            cache.selectionsToResolve.add(selection);
                        });
                    }
                },
            });
            return cache;
        };
        return {
            ...traverse(operationDefinition),
            operationDefinition,
            fragmentMap,
        };
    }
}
exports.LocalState = LocalState;
function inferRootTypename({ operation }) {
    return operation.charAt(0).toUpperCase() + operation.slice(1);
}
// eslint-disable-next-line @typescript-eslint/no-restricted-types
function isGraphQLError(error) {
    return (error.name === "GraphQLError" &&
        // Check to see if the error contains keys returned in toJSON. The values
        // might be `undefined` if not set, but we don't care about those as we
        // can be reasonably sure this is a GraphQLError if all of these properties
        // exist on the error
        "path" in error &&
        "locations" in error &&
        "extensions" in error);
}
function addExtension(error, meta) {
    return {
        ...error,
        extensions: {
            ...error.extensions,
            localState: meta,
        },
    };
}
function getExportedVariableName(directive) {
    if (directive.arguments) {
        for (const arg of directive.arguments) {
            if (arg.name.value === "as" && arg.value.kind === graphql_1.Kind.STRING) {
                return arg.value.value;
            }
        }
    }
}
function validateCacheImplementation(cache) {
    (0, invariant_1.invariant)(cache.fragmentMatches, 57);
}
function getCacheResultAtPath(diff, path) {
    if (diff.result === null) {
        // Intentionally return undefined to signal we have no cache data
        return;
    }
    return path.reduce((value, segment) => value?.[segment], diff.result);
}
function isForcedResolver(field) {
    return (field.directives?.some((directive) => {
        if (directive.name.value !== "client" || !directive.arguments) {
            return false;
        }
        return directive.arguments.some((arg) => arg.name.value === "always" &&
            arg.value.kind === "BooleanValue" &&
            arg.value.value === true);
    }) ?? false);
}
// If the incoming document is a query, return it as is. Otherwise, build a
// new document containing a query operation based on the selection set
// of the previous main operation.
function toQueryOperation(document) {
    const definition = (0, internal_1.getMainDefinition)(document);
    const definitionOperation = definition.operation;
    if (definitionOperation === "query") {
        // Already a query, so return the existing document.
        return document;
    }
    // Build a new query using the selection set of the main operation.
    const modifiedDoc = (0, graphql_1.visit)(document, {
        OperationDefinition: {
            enter(node) {
                return {
                    ...node,
                    operation: "query",
                };
            },
        },
    });
    return modifiedDoc;
}
//# sourceMappingURL=LocalState.cjs.map
