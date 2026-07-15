import { WeakCache } from "@wry/caches";
import { Kind, visit } from "graphql";
import { wrap } from "optimism";
import { ApolloLink } from "@apollo/client/link";
import { cacheSizes, stripTypename } from "@apollo/client/utilities";
import { __DEV__ } from "@apollo/client/utilities/environment";
import { bindCacheKey, isPlainObject } from "@apollo/client/utilities/internal";
/**
 * Sentinel value used to indicate that `__typename` fields should be kept
 * for a specific field or input type.
 *
 * @remarks
 * Use this value in the `except` configuration to preserve `__typename`
 * fields in JSON scalar fields or other cases where you need to retain
 * the typename information.
 *
 * @example
 *
 * ```ts
 * import {
 *   RemoveTypenameFromVariablesLink,
 *   KEEP,
 * } from "@apollo/client/link/remove-typename";
 *
 * const link = new RemoveTypenameFromVariablesLink({
 *   except: {
 *     JSON: KEEP, // Keep __typename for all JSON scalar variables
 *     DashboardInput: {
 *       config: KEEP, // Keep __typename only for the config field
 *     },
 *   },
 * });
 * ```
 */
export const KEEP = "__KEEP";
/**
 * @deprecated
 * Use `RemoveTypenameFromVariablesLink` from `@apollo/client/link/remove-typename` instead.
 */
export function removeTypenameFromVariables(options) {
    return new RemoveTypenameFromVariablesLink(options);
}
/**
 * `RemoveTypenameFromVariablesLink` is a non-terminating link that automatically
 * removes `__typename` fields from operation variables to prevent GraphQL
 * validation errors.
 *
 * @remarks
 *
 * When reusing data from a query as input to another GraphQL operation,
 * `__typename` fields can cause server-side validation errors because input
 * types don't accept fields that start with double underscores (`__`).
 * `RemoveTypenameFromVariablesLink` automatically strips these fields from all
 * operation variables.
 *
 * @example
 *
 * ```ts
 * import { RemoveTypenameFromVariablesLink } from "@apollo/client/link/remove-typename";
 *
 * const link = new RemoveTypenameFromVariablesLink();
 * ```
 */
export class RemoveTypenameFromVariablesLink extends ApolloLink {
    constructor(options = {}) {
        super((operation, forward) => {
            const { except } = options;
            const { query, variables } = operation;
            if (variables) {
                operation.variables =
                    except ?
                        this.maybeStripTypenameUsingConfig(query, variables, except)
                        : stripTypename(variables);
            }
            return forward(operation);
        });
        return Object.assign(this, __DEV__ ?
            {
                getMemoryInternals() {
                    return {
                        removeTypenameFromVariables: {
                            getVariableDefinitions: this.getVariableDefinitions?.size ?? 0,
                        },
                    };
                },
            }
            : {});
    }
    maybeStripTypenameUsingConfig(query, variables, config) {
        const variableDefinitions = this.getVariableDefinitions(query);
        return Object.fromEntries(Object.entries(variables).map((keyVal) => {
            const [key, value] = keyVal;
            const typename = variableDefinitions[key];
            const typenameConfig = config[typename];
            keyVal[1] =
                typenameConfig ?
                    this.maybeStripTypename(value, typenameConfig)
                    : stripTypename(value);
            return keyVal;
        }));
    }
    maybeStripTypename(value, config) {
        if (config === KEEP) {
            return value;
        }
        if (Array.isArray(value)) {
            return value.map((item) => this.maybeStripTypename(item, config));
        }
        if (isPlainObject(value)) {
            const modified = {};
            Object.keys(value).forEach((key) => {
                const child = value[key];
                if (key === "__typename") {
                    return;
                }
                const fieldConfig = config[key];
                modified[key] =
                    fieldConfig ?
                        this.maybeStripTypename(child, fieldConfig)
                        : stripTypename(child);
            });
            return modified;
        }
        return value;
    }
    getVariableDefinitions = wrap((document) => {
        const definitions = {};
        visit(document, {
            VariableDefinition(node) {
                definitions[node.variable.name.value] = unwrapType(node.type);
            },
        });
        return definitions;
    }, {
        max: cacheSizes["removeTypenameFromVariables.getVariableDefinitions"] ||
            2000 /* defaultCacheSizes["removeTypenameFromVariables.getVariableDefinitions"] */,
        cache: WeakCache,
        makeCacheKey: bindCacheKey(this),
    });
}
function unwrapType(node) {
    switch (node.kind) {
        case Kind.NON_NULL_TYPE:
            return unwrapType(node.type);
        case Kind.LIST_TYPE:
            return unwrapType(node.type);
        case Kind.NAMED_TYPE:
            return node.name.value;
    }
}
//# sourceMappingURL=removeTypenameFromVariables.js.map