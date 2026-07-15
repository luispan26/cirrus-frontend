import { __rest } from "tslib";
import { mergeDeep } from "@apollo/client/utilities/internal";
/**
 * A basic pagination field policy that always concatenates new
 * results onto the existing array, without examining options.args.
 *
 * @param keyArgs - `keyArgs` that should be applied to the field policy
 * @returns The field policy that handles concatenating field results.
 */
export function concatPagination(keyArgs = false) {
    return {
        keyArgs,
        merge(existing, incoming) {
            return existing ? [...existing, ...incoming] : incoming;
        },
    };
}
/**
 * A basic field policy that uses `options.args.{offset,limit}` to splice
 * the incoming data into the existing array. If your arguments are called
 * something different (like `args.{start,count}`), feel free to copy/paste
 * this implementation and make the appropriate changes.
 *
 * @param keyArgs - `keyArgs` that should be applied to the field policy
 * @returns The field policy that handles offset/limit pagination
 */
export function offsetLimitPagination(keyArgs = false) {
    return {
        keyArgs,
        merge(existing, incoming, { args }) {
            const merged = existing ? existing.slice(0) : [];
            if (incoming) {
                if (args) {
                    // Assume an offset of 0 if args.offset omitted.
                    const { offset = 0 } = args;
                    for (let i = 0; i < incoming.length; ++i) {
                        merged[offset + i] = incoming[i];
                    }
                }
                else {
                    // It's unusual (probably a mistake) for a paginated field not
                    // to receive any arguments, so you might prefer to throw an
                    // exception here, instead of recovering by appending incoming
                    // onto the existing array.
                    merged.push(...incoming);
                }
            }
            return merged;
        },
    };
}
// As proof of the flexibility of field policies, this function generates
// one that handles Relay-style pagination, without Apollo Client knowing
// anything about connections, edges, cursors, or pageInfo objects.
/**
 * A field policy that attempts to handle pagination for fields that adhere to
 * the [Relay Connections Spec](https://relay.dev/graphql/connections.htm).
 *
 * @param keyArgs - `keyArgs` that should be applied to the field policy
 * @returns The field policy that handles Relay pagination
 */
export function relayStylePagination(keyArgs = false) {
    return {
        keyArgs,
        read(existing, { canRead, readField }) {
            if (!existing)
                return existing;
            const edges = [];
            let firstEdgeCursor = "";
            let lastEdgeCursor = "";
            existing.edges.forEach((edge) => {
                // Edges themselves could be Reference objects, so it's important
                // to use readField to access the edge.edge.node property.
                if (canRead(readField("node", edge))) {
                    edges.push(edge);
                    if (edge.cursor) {
                        firstEdgeCursor = firstEdgeCursor || edge.cursor || "";
                        lastEdgeCursor = edge.cursor || lastEdgeCursor;
                    }
                }
            });
            if (edges.length > 1 && firstEdgeCursor === lastEdgeCursor) {
                firstEdgeCursor = "";
            }
            const { startCursor, endCursor } = existing.pageInfo || {};
            return {
                // Some implementations return additional Connection fields, such
                // as existing.totalCount. These fields are saved by the merge
                // function, so the read function should also preserve them.
                ...getExtras(existing),
                edges,
                pageInfo: {
                    ...existing.pageInfo,
                    // If existing.pageInfo.{start,end}Cursor are undefined or "", default
                    // to firstEdgeCursor and/or lastEdgeCursor.
                    startCursor: startCursor || firstEdgeCursor,
                    endCursor: endCursor || lastEdgeCursor,
                },
            };
        },
        merge(existing, incoming, { args, isReference, readField }) {
            if (!existing) {
                existing = makeEmptyData();
            }
            if (!incoming) {
                return existing;
            }
            const incomingEdges = incoming.edges ?
                incoming.edges.map((edge) => {
                    if (isReference((edge = { ...edge }))) {
                        // In case edge is a Reference, we read out its cursor field and
                        // store it as an extra property of the Reference object.
                        edge.cursor = readField("cursor", edge);
                    }
                    return edge;
                })
                : [];
            if (incoming.pageInfo) {
                const { pageInfo } = incoming;
                const { startCursor, endCursor } = pageInfo;
                const firstEdge = incomingEdges[0];
                const lastEdge = incomingEdges[incomingEdges.length - 1];
                // In case we did not request the cursor field for edges in this
                // query, we can still infer cursors from pageInfo.
                if (firstEdge && startCursor) {
                    firstEdge.cursor = startCursor;
                }
                if (lastEdge && endCursor) {
                    lastEdge.cursor = endCursor;
                }
                // Cursors can also come from edges, so we default
                // pageInfo.{start,end}Cursor to {first,last}Edge.cursor.
                const firstCursor = firstEdge && firstEdge.cursor;
                if (firstCursor && !startCursor) {
                    incoming = mergeDeep(incoming, {
                        pageInfo: {
                            startCursor: firstCursor,
                        },
                    });
                }
                const lastCursor = lastEdge && lastEdge.cursor;
                if (lastCursor && !endCursor) {
                    incoming = mergeDeep(incoming, {
                        pageInfo: {
                            endCursor: lastCursor,
                        },
                    });
                }
            }
            let prefix = existing.edges;
            let suffix = [];
            if (args && args.after) {
                // This comparison does not need to use readField("cursor", edge),
                // because we stored the cursor field of any Reference edges as an
                // extra property of the Reference object.
                const index = prefix.findIndex((edge) => edge.cursor === args.after);
                if (index >= 0) {
                    prefix = prefix.slice(0, index + 1);
                    // suffix = []; // already true
                }
            }
            else if (args && args.before) {
                const index = prefix.findIndex((edge) => edge.cursor === args.before);
                suffix = index < 0 ? prefix : prefix.slice(index);
                prefix = [];
            }
            else if (incoming.edges) {
                // If we have neither args.after nor args.before, the incoming
                // edges cannot be spliced into the existing edges, so they must
                // replace the existing edges. See #6592 for a motivating example.
                prefix = [];
            }
            const edges = [...prefix, ...incomingEdges, ...suffix];
            const pageInfo = {
                // The ordering of these two ...spreads may be surprising, but it
                // makes sense because we want to combine PageInfo properties with a
                // preference for existing values, *unless* the existing values are
                // overridden by the logic below, which is permitted only when the
                // incoming page falls at the beginning or end of the data.
                ...incoming.pageInfo,
                ...existing.pageInfo,
            };
            if (incoming.pageInfo) {
                const { hasPreviousPage, hasNextPage, startCursor, endCursor, ...extras } = incoming.pageInfo;
                // If incoming.pageInfo had any extra non-standard properties,
                // assume they should take precedence over any existing properties
                // of the same name, regardless of where this page falls with
                // respect to the existing data.
                Object.assign(pageInfo, extras);
                // Keep existing.pageInfo.has{Previous,Next}Page unless the
                // placement of the incoming edges means incoming.hasPreviousPage
                // or incoming.hasNextPage should become the new values for those
                // properties in existing.pageInfo. Note that these updates are
                // only permitted when the beginning or end of the incoming page
                // coincides with the beginning or end of the existing data, as
                // determined using prefix.length and suffix.length.
                if (!prefix.length) {
                    if (void 0 !== hasPreviousPage)
                        pageInfo.hasPreviousPage = hasPreviousPage;
                    if (void 0 !== startCursor)
                        pageInfo.startCursor = startCursor;
                }
                if (!suffix.length) {
                    if (void 0 !== hasNextPage)
                        pageInfo.hasNextPage = hasNextPage;
                    if (void 0 !== endCursor)
                        pageInfo.endCursor = endCursor;
                }
            }
            return {
                ...getExtras(existing),
                ...getExtras(incoming),
                edges,
                pageInfo,
            };
        },
    };
}
// Returns any unrecognized properties of the given object.
const getExtras = (obj) => __rest(obj, notExtras);
const notExtras = ["edges", "pageInfo"];
function makeEmptyData() {
    return {
        edges: [],
        pageInfo: {
            hasPreviousPage: false,
            hasNextPage: true,
            startCursor: "",
            endCursor: "",
        },
    };
}
//# sourceMappingURL=pagination.js.map