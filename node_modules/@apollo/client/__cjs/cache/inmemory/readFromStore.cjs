"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreReader = void 0;
const graphql_1 = require("graphql");
const optimism_1 = require("optimism");
const utilities_1 = require("@apollo/client/utilities");
const environment_1 = require("@apollo/client/utilities/environment");
const internal_1 = require("@apollo/client/utilities/internal");
const invariant_1 = require("@apollo/client/utilities/invariant");
const common_js_1 = require("../core/types/common.cjs");
const entityStore_js_1 = require("./entityStore.cjs");
const helpers_js_1 = require("./helpers.cjs");
function execSelectionSetKeyArgs(options) {
    return [options.selectionSet, options.objectOrReference, options.context];
}
class StoreReader {
    // cached version of executeSelectionSet
    executeSelectionSet;
    // cached version of executeSubSelectedArray
    executeSubSelectedArray;
    config;
    knownResults = new WeakMap();
    constructor(config) {
        this.config = config;
        // memoized functions in this class will be "garbage-collected"
        // by recreating the whole `StoreReader` in
        // `InMemoryCache.resetResultsCache`
        // (triggered from `InMemoryCache.gc` with `resetResultCache: true`)
        this.executeSelectionSet = (0, optimism_1.wrap)((options) => {
            const peekArgs = execSelectionSetKeyArgs(options);
            const other = this.executeSelectionSet.peek(...peekArgs);
            if (other) {
                // If we previously read this result with canonization enabled, we can
                // return that canonized result as-is.
                return other;
            }
            (0, entityStore_js_1.maybeDependOnExistenceOfEntity)(options.context.store, options.enclosingRef.__ref);
            // Finally, if we didn't find any useful previous results, run the real
            // execSelectionSetImpl method with the given options.
            return this.execSelectionSetImpl(options);
        }, {
            max: utilities_1.cacheSizes["inMemoryCache.executeSelectionSet"] ||
                50000 /* defaultCacheSizes["inMemoryCache.executeSelectionSet"] */,
            keyArgs: execSelectionSetKeyArgs,
            // Note that the parameters of makeCacheKey are determined by the
            // array returned by keyArgs.
            makeCacheKey(selectionSet, parent, context) {
                if ((0, entityStore_js_1.supportsResultCaching)(context.store)) {
                    return context.store.makeCacheKey(selectionSet, (0, utilities_1.isReference)(parent) ? parent.__ref : parent, context.varString);
                }
            },
        });
        this.executeSubSelectedArray = (0, optimism_1.wrap)((options) => {
            (0, entityStore_js_1.maybeDependOnExistenceOfEntity)(options.context.store, options.enclosingRef.__ref);
            return this.execSubSelectedArrayImpl(options);
        }, {
            max: utilities_1.cacheSizes["inMemoryCache.executeSubSelectedArray"] ||
                10000 /* defaultCacheSizes["inMemoryCache.executeSubSelectedArray"] */,
            makeCacheKey({ field, array, context }) {
                if ((0, entityStore_js_1.supportsResultCaching)(context.store)) {
                    return context.store.makeCacheKey(field, array, context.varString);
                }
            },
        });
    }
    /**
     * Given a store and a query, return as much of the result as possible and
     * identify if any data was missing from the store.
     */
    diffQueryAgainstStore({ store, query, rootId = "ROOT_QUERY", variables, returnPartialData = true, }) {
        const policies = this.config.cache.policies;
        variables = {
            ...(0, internal_1.getDefaultValues)((0, internal_1.getQueryDefinition)(query)),
            ...variables,
        };
        const rootRef = (0, internal_1.makeReference)(rootId);
        const execResult = this.executeSelectionSet({
            selectionSet: (0, internal_1.getMainDefinition)(query).selectionSet,
            objectOrReference: rootRef,
            enclosingRef: rootRef,
            context: {
                store,
                query,
                policies,
                variables,
                varString: (0, utilities_1.canonicalStringify)(variables),
                ...(0, helpers_js_1.extractFragmentContext)(query, this.config.fragments),
            },
        });
        let missing;
        if (execResult.missing) {
            missing = new common_js_1.MissingFieldError(firstMissing(execResult.missing), execResult.missing, query, variables);
        }
        const complete = !missing;
        const { result } = execResult;
        return {
            result: complete ? result
                : returnPartialData ?
                    Object.keys(result).length === 0 ?
                        null
                        : result
                    : null,
            complete,
            missing,
        };
    }
    isFresh(result, parent, selectionSet, context) {
        if ((0, entityStore_js_1.supportsResultCaching)(context.store) &&
            this.knownResults.get(result) === selectionSet) {
            const latest = this.executeSelectionSet.peek(selectionSet, parent, context);
            if (latest && result === latest.result) {
                return true;
            }
        }
        return false;
    }
    // Uncached version of executeSelectionSet.
    execSelectionSetImpl({ selectionSet, objectOrReference, enclosingRef, context, }) {
        if ((0, utilities_1.isReference)(objectOrReference) &&
            !context.policies.rootTypenamesById[objectOrReference.__ref] &&
            !context.store.has(objectOrReference.__ref)) {
            return {
                result: {},
                missing: `Dangling reference to missing ${objectOrReference.__ref} object`,
            };
        }
        const { variables, policies, store } = context;
        const typename = store.getFieldValue(objectOrReference, "__typename");
        const objectsToMerge = [];
        let missing;
        const missingMerger = new internal_1.DeepMerger();
        if (typeof typename === "string" && !policies.rootIdsByTypename[typename]) {
            // Ensure we always include a default value for the __typename
            // field, if we have one. Note that this field can be overridden by other
            // merged objects.
            objectsToMerge.push({ __typename: typename });
        }
        function handleMissing(result, resultName) {
            if (result.missing) {
                missing = missingMerger.merge(missing, {
                    [resultName]: result.missing,
                });
            }
            return result.result;
        }
        const workSet = new Set(selectionSet.selections);
        workSet.forEach((selection) => {
            // Omit fields with directives @skip(if: <truthy value>) or
            // @include(if: <falsy value>).
            if (!(0, internal_1.shouldInclude)(selection, variables))
                return;
            if ((0, internal_1.isField)(selection)) {
                let fieldValue = policies.readField({
                    fieldName: selection.name.value,
                    field: selection,
                    variables: context.variables,
                    from: objectOrReference,
                }, context);
                const resultName = (0, internal_1.resultKeyNameFromField)(selection);
                if (fieldValue === void 0) {
                    if (!utilities_1.addTypenameToDocument.added(selection)) {
                        missing = missingMerger.merge(missing, {
                            [resultName]: `Can't find field '${selection.name.value}' on ${(0, utilities_1.isReference)(objectOrReference) ?
                                objectOrReference.__ref + " object"
                                : "object " + JSON.stringify(objectOrReference, null, 2)}`,
                        });
                    }
                }
                else if ((0, internal_1.isArray)(fieldValue)) {
                    if (fieldValue.length > 0) {
                        fieldValue = handleMissing(this.executeSubSelectedArray({
                            field: selection,
                            array: fieldValue,
                            enclosingRef,
                            context,
                        }), resultName);
                    }
                }
                else if (!selection.selectionSet) {
                    // do nothing
                }
                else if (fieldValue != null) {
                    // In this case, because we know the field has a selection set,
                    // it must be trying to query a GraphQLObjectType, which is why
                    // fieldValue must be != null.
                    fieldValue = handleMissing(this.executeSelectionSet({
                        selectionSet: selection.selectionSet,
                        objectOrReference: fieldValue,
                        enclosingRef: (0, utilities_1.isReference)(fieldValue) ? fieldValue : enclosingRef,
                        context,
                    }), resultName);
                }
                if (fieldValue !== void 0) {
                    objectsToMerge.push({ [resultName]: fieldValue });
                }
            }
            else {
                const fragment = (0, internal_1.getFragmentFromSelection)(selection, context.lookupFragment);
                if (!fragment && selection.kind === graphql_1.Kind.FRAGMENT_SPREAD) {
                    throw (0, invariant_1.newInvariantError)(112, selection.name.value);
                }
                if (fragment && policies.fragmentMatches(fragment, typename)) {
                    fragment.selectionSet.selections.forEach(workSet.add, workSet);
                }
            }
        });
        const result = (0, internal_1.mergeDeepArray)(objectsToMerge);
        const finalResult = { result, missing };
        const frozen = (0, internal_1.maybeDeepFreeze)(finalResult);
        // Store this result with its selection set so that we can quickly
        // recognize it again in the StoreReader#isFresh method.
        if (frozen.result) {
            this.knownResults.set(frozen.result, selectionSet);
        }
        return frozen;
    }
    // Uncached version of executeSubSelectedArray.
    execSubSelectedArrayImpl({ field, array, enclosingRef, context, }) {
        let missing;
        let missingMerger = new internal_1.DeepMerger();
        function handleMissing(childResult, i) {
            if (childResult.missing) {
                missing = missingMerger.merge(missing, { [i]: childResult.missing });
            }
            return childResult.result;
        }
        if (field.selectionSet) {
            array = array.filter((item) => item === undefined || context.store.canRead(item));
        }
        array = array.map((item, i) => {
            // null value in array
            if (item === null) {
                return null;
            }
            // This is a nested array, recurse
            if ((0, internal_1.isArray)(item)) {
                return handleMissing(this.executeSubSelectedArray({
                    field,
                    array: item,
                    enclosingRef,
                    context,
                }), i);
            }
            // This is an object, run the selection set on it
            if (field.selectionSet) {
                return handleMissing(this.executeSelectionSet({
                    selectionSet: field.selectionSet,
                    objectOrReference: item,
                    enclosingRef: (0, utilities_1.isReference)(item) ? item : enclosingRef,
                    context,
                }), i);
            }
            if (environment_1.__DEV__) {
                assertSelectionSetForIdValue(context.store, field, item);
            }
            return item;
        });
        return {
            result: array,
            missing,
        };
    }
}
exports.StoreReader = StoreReader;
function firstMissing(tree) {
    try {
        JSON.stringify(tree, (_, value) => {
            if (typeof value === "string")
                throw value;
            return value;
        });
    }
    catch (result) {
        return result;
    }
}
function assertSelectionSetForIdValue(store, field, fieldValue) {
    if (!field.selectionSet) {
        const workSet = new Set([fieldValue]);
        workSet.forEach((value) => {
            if ((0, internal_1.isNonNullObject)(value)) {
                (0, invariant_1.invariant)(
                    !(0, utilities_1.isReference)(value),
                    113,
                    (0, helpers_js_1.getTypenameFromStoreObject)(store, value),
                    field.name.value
                );
                Object.values(value).forEach(workSet.add, workSet);
            }
        });
    }
}
//# sourceMappingURL=readFromStore.cjs.map
