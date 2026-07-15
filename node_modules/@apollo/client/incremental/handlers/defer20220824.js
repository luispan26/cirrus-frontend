import { DeepMerger, hasDirectives, isNonEmptyArray, } from "@apollo/client/utilities/internal";
class DeferRequest {
    hasNext = true;
    errors = [];
    extensions = {};
    data = {};
    // This tracks paths for `@stream` arrays that returns items: null due to
    // errors thrown for non-null array items. We stop processing future updates
    // to these stream arrays to prevent creating sparse arrays or inserting
    // `null` for an expected non-null value which could cause runtime crashes.
    ignoredImpossibleStreamPaths = new Set();
    merge(normalized, atPath) {
        if (normalized.data !== undefined) {
            this.data = new DeepMerger({ arrayMerge: "truncate" }).merge(this.data, normalized.data, { atPath });
        }
        if (normalized.errors) {
            this.errors.push(...normalized.errors);
        }
        Object.assign(this.extensions, normalized.extensions);
    }
    handle(
    // we'll get `undefined` here in case of a `no-cache` fetch policy,
    // so we'll continue with the last value this request had accumulated
    cacheData = this.data, chunk) {
        this.hasNext = chunk.hasNext;
        this.data = cacheData;
        if (hasIncrementalChunks(chunk)) {
            for (const incremental of chunk.incremental) {
                const { path, errors, extensions } = incremental;
                if ("items" in incremental) {
                    // Remove the array index from the end of the array since each future
                    // chunk sends a different array index. This normalizes the path to
                    // ensure we ignore updates to this field if `items` is `null`.
                    const stringPath = path?.slice(0, -1).join(".") ?? "";
                    if (incremental.items === null) {
                        this.ignoredImpossibleStreamPaths.add(stringPath);
                    }
                    if (this.ignoredImpossibleStreamPaths.has(stringPath)) {
                        this.merge({ errors, extensions });
                        continue;
                    }
                }
                let data = "items" in incremental ? incremental.items
                    // Ensure `data: null` isn't merged for `@defer` responses by
                    // falling back to `undefined`
                    : "data" in incremental ? incremental.data ?? undefined
                        : undefined;
                if (path && typeof path.at(-1) === "number" && Array.isArray(data)) {
                    const startingIdx = path.at(-1);
                    data.forEach((item, idx) => {
                        this.merge({ data: item }, [
                            ...path.slice(0, -1),
                            startingIdx + idx,
                        ]);
                    });
                }
                else {
                    this.merge({ data }, path);
                }
                this.merge({ errors, extensions });
            }
        }
        else {
            this.merge(chunk);
        }
        const result = { data: this.data };
        if (isNonEmptyArray(this.errors)) {
            result.errors = this.errors;
        }
        if (Object.keys(this.extensions).length > 0) {
            result.extensions = this.extensions;
        }
        return result;
    }
}
/**
 * This handler implements the `@defer` directive as specified in this historical commit:
 * https://github.com/graphql/graphql-spec/tree/48cf7263a71a683fab03d45d309fd42d8d9a6659/spec
 */
export class Defer20220824Handler {
    isIncrementalResult(result) {
        return "hasNext" in result;
    }
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
        }
        if (acc.length) {
            return acc;
        }
    }
    prepareRequest(request) {
        if (hasDirectives(["defer", "stream"], request.query)) {
            const context = request.context ?? {};
            const http = (context.http ??= {});
            http.accept = [
                "multipart/mixed;deferSpec=20220824",
                ...(http.accept || []),
            ];
        }
        return request;
    }
    startRequest(_) {
        return new DeferRequest();
    }
}
// only exported for use in tests
export function hasIncrementalChunks(result) {
    return isNonEmptyArray(result.incremental);
}
//# sourceMappingURL=defer20220824.js.map