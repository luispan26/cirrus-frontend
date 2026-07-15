"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQL17Alpha9Handler = void 0;
const trie_1 = require("@wry/trie");
const internal_1 = require("@apollo/client/utilities/internal");
const internal_2 = require("@apollo/client/utilities/internal");
const invariant_1 = require("@apollo/client/utilities/invariant");
class IncrementalRequest {
    hasNext = true;
    data = {};
    errors = [];
    extensions = {};
    pending = new Map();
    streamInfo = new trie_1.Trie(false, () => ({
        current: { isFirstChunk: true, isLastChunk: false },
    }));
    // `streamPositions` maps `pending.id` to the index that should be set by the
    // next `incremental` stream chunk to ensure the streamed array item is placed
    // at the correct point in the data array. `this.data` contains cached
    // references with the full array so we can't rely on the array length in
    // `this.data` to determine where to place item. This also ensures that items
    // updated by the cache between a streamed chunk aren't overwritten by merges
    // of future stream items from already merged stream items.
    streamPositions = {};
    handle(cacheData = this.data, chunk) {
        this.hasNext = chunk.hasNext;
        this.data = cacheData;
        if (chunk.pending) {
            for (const pending of chunk.pending) {
                this.pending.set(pending.id, pending);
                if ("data" in chunk) {
                    const dataAtPath = pending.path.reduce((data, key) => data[key], chunk.data);
                    if (Array.isArray(dataAtPath)) {
                        this.streamPositions[pending.id] = dataAtPath.length;
                        this.streamInfo.lookupArray(pending.path).current = {
                            isFirstChunk: true,
                            isLastChunk: false,
                        };
                    }
                }
            }
        }
        if (hasIncrementalChunks(chunk)) {
            for (const incremental of chunk.incremental) {
                const pending = this.pending.get(incremental.id);
                (0, invariant_1.invariant)(pending, 66);
                const path = pending.path.concat(incremental.subPath ?? []);
                let data;
                if ("items" in incremental) {
                    const items = incremental.items;
                    const parent = [];
                    // This creates a sparse array with values set at the indices streamed
                    // from the server. DeepMerger uses Object.keys and will correctly
                    // place the values in this array in the correct place
                    for (let i = 0; i < items.length; i++) {
                        parent[i + this.streamPositions[pending.id]] = items[i];
                    }
                    this.streamPositions[pending.id] += items.length;
                    this.streamInfo.lookupArray(path).current = {
                        isFirstChunk: false,
                        isLastChunk: false,
                    };
                    data = parent;
                }
                else {
                    data = incremental.data;
                    // Check if any pending streams added arrays from deferred data so
                    // that we can update streamPositions with the initial length of the
                    // array to ensure future streamed items are inserted at the right
                    // starting index.
                    this.pending.forEach((pendingItem) => {
                        if (!(pendingItem.id in this.streamPositions)) {
                            // Check if this incremental data contains array data for the pending path
                            // The pending path is absolute, but incremental data is relative to the defer
                            // E.g., pending.path = ["nestedObject"], pendingItem.path = ["nestedObject", "nestedFriendList"]
                            // incremental.data = { scalarField: "...", nestedFriendList: [...] }
                            // So we need the path from pending.path onwards
                            const relativePath = pendingItem.path.slice(pending.path.length);
                            const dataAtPath = relativePath.reduce((data, key) => data?.[key], incremental.data);
                            if (Array.isArray(dataAtPath)) {
                                this.streamPositions[pendingItem.id] = dataAtPath.length;
                            }
                        }
                    });
                }
                this.merge({
                    data,
                    extensions: incremental.extensions,
                    errors: incremental.errors,
                }, path);
            }
        }
        else {
            this.merge(chunk);
        }
        if ("completed" in chunk && chunk.completed) {
            for (const completed of chunk.completed) {
                const { path } = this.pending.get(completed.id);
                const streamPosition = this.streamPositions[completed.id];
                // Truncate any stream arrays in case the chunk only contains `hasNext`
                // and `completed`.
                if (streamPosition !== undefined) {
                    const dataAtPath = path.reduce((data, key) => data?.[key], this.data);
                    this.merge({ data: dataAtPath.slice(0, streamPosition) }, path);
                }
                // peek instead of lookup to avoid creating an entry for non-array values
                const details = this.streamInfo.peekArray(path);
                if (details) {
                    details.current = {
                        isFirstChunk: false,
                        isLastChunk: true,
                    };
                }
                this.pending.delete(completed.id);
                if (completed.errors) {
                    this.errors.push(...completed.errors);
                }
            }
        }
        const result = { data: this.data };
        if ((0, internal_2.isNonEmptyArray)(this.errors)) {
            result.errors = this.errors;
        }
        if (Object.keys(this.extensions).length > 0) {
            result.extensions = this.extensions;
        }
        if (this.streamInfo["strong"]) {
            result.extensions = {
                ...result.extensions,
                // Create a new object so we can check for === in QueryInfo to trigger a
                // final cache write when emitting a `hasNext: false` by itself.
                // We create a `WeakRef`, not a plain object to avoid retaining memory
                // in case the `result` or `extensions` stays around longer than the handler
                // itself.
                [internal_1.streamInfoSymbol]: new WeakRef(this.streamInfo),
            };
        }
        return result;
    }
    merge(normalized, atPath) {
        if (normalized.data !== undefined) {
            this.data = new internal_1.DeepMerger({ arrayMerge: "truncate" }).merge(this.data, normalized.data, { atPath });
        }
        if (normalized.errors) {
            this.errors.push(...normalized.errors);
        }
        Object.assign(this.extensions, normalized.extensions);
    }
}
/**
 * Provides handling for the incremental delivery specification implemented by
 * graphql.js version `17.0.0-alpha.9`.
 */
class GraphQL17Alpha9Handler {
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    isIncrementalResult(result) {
        return "hasNext" in result;
    }
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    prepareRequest(request) {
        if ((0, internal_2.hasDirectives)(["defer", "stream"], request.query)) {
            const context = request.context ?? {};
            const http = (context.http ??= {});
            // https://specs.apollo.dev/incremental/v0.2/
            http.accept = [
                "multipart/mixed;incrementalSpec=v0.2",
                ...(http.accept || []),
            ];
            request.context = context;
        }
        return request;
    }
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    extractErrors(result) {
        const acc = [];
        const push = ({ errors, }) => {
            if (errors) {
                acc.push(...errors);
            }
        };
        if (this.isIncrementalResult(result)) {
            if ("errors" in result) {
                push(result);
            }
            if (hasIncrementalChunks(result)) {
                result.incremental.forEach(push);
            }
            if (hasCompletedChunks(result)) {
                result.completed.forEach(push);
            }
        }
        else if ("errors" in result) {
            push(result);
        }
        if (acc.length) {
            return acc;
        }
    }
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    startRequest(_) {
        return new IncrementalRequest();
    }
}
exports.GraphQL17Alpha9Handler = GraphQL17Alpha9Handler;
function hasIncrementalChunks(result) {
    return (0, internal_2.isNonEmptyArray)(result.incremental);
}
function hasCompletedChunks(result) {
    return (0, internal_2.isNonEmptyArray)(result.completed);
}
//# sourceMappingURL=graphql17Alpha9.cjs.map
