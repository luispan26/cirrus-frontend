"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoveTypenameFromVariablesLink = exports.KEEP = void 0;
exports.removeTypenameFromVariables = removeTypenameFromVariables;
const caches_1 = require("@wry/caches");
const graphql_1 = require("graphql");
const optimism_1 = require("optimism");
const link_1 = require("@apollo/client/link");
const utilities_1 = require("@apollo/client/utilities");
const environment_1 = require("@apollo/client/utilities/environment");
const internal_1 = require("@apollo/client/utilities/internal");
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
exports.KEEP = "__KEEP";
/**
 * @deprecated
 * Use `RemoveTypenameFromVariablesLink` from `@apollo/client/link/remove-typename` instead.
 */
function removeTypenameFromVariables(options) {
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
class RemoveTypenameFromVariablesLink extends link_1.ApolloLink {
    constructor(options = {}) {
        super((operation, forward) => {
            const { except } = options;
            const { query, variables } = operation;
            if (variables) {
                operation.variables =
                    except ?
                        this.maybeStripTypenameUsingConfig(query, variables, except)
                        : (0, utilities_1.stripTypename)(variables);
            }
            return forward(operation);
        });
        return Object.assign(this, environment_1.__DEV__ ?
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
                    : (0, utilities_1.stripTypename)(value);
            return keyVal;
        }));
    }
    maybeStripTypename(value, config) {
        if (config === exports.KEEP) {
            return value;
        }
        if (Array.isArray(value)) {
            return value.map((item) => this.maybeStripTypename(item, config));
        }
        if ((0, internal_1.isPlainObject)(value)) {
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
                        : (0, utilities_1.stripTypename)(child);
            });
            return modified;
        }
        return value;
    }
    getVariableDefinitions = (0, optimism_1.wrap)((document) => {
        const definitions = {};
        (0, graphql_1.visit)(document, {
            VariableDefinition(node) {
                definitions[node.variable.name.value] = unwrapType(node.type);
            },
        });
        return definitions;
    }, {
        max: utilities_1.cacheSizes["removeTypenameFromVariables.getVariableDefinitions"] ||
            2000 /* defaultCacheSizes["removeTypenameFromVariables.getVariableDefinitions"] */,
        cache: caches_1.WeakCache,
        makeCacheKey: (0, internal_1.bindCacheKey)(this),
    });
}
exports.RemoveTypenameFromVariablesLink = RemoveTypenameFromVariablesLink;
function unwrapType(node) {
    switch (node.kind) {
        case graphql_1.Kind.NON_NULL_TYPE:
            return unwrapType(node.type);
        case graphql_1.Kind.LIST_TYPE:
            return unwrapType(node.type);
        case graphql_1.Kind.NAMED_TYPE:
            return node.name.value;
    }
}
//# sourceMappingURL=removeTypenameFromVariables.cjs.map
