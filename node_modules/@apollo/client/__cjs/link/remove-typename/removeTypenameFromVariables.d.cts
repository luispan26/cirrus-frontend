import { ApolloLink } from "@apollo/client/link";
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
export declare const KEEP = "__KEEP";
export declare namespace RemoveTypenameFromVariablesLink {
    /**
     * Configuration object that specifies which input types and fields should
     * retain their `__typename` fields.
     *
     * @remarks
     * This is a recursive configuration where:
     *
     * - Keys represent GraphQL input type names or field names
     * - Values can be either the `KEEP` sentinel to preserve all `__typename`
     *   fields, or a nested `KeepTypenameConfig` to preserve `__typename` fields on
     *   a specific field name.
     *
     * @example
     *
     * ```ts
     * const config: KeepTypenameConfig = {
     *   // Keep __typename for all JSON scalar variables
     *   JSON: KEEP,
     *
     *   // For DashboardInput, only keep __typename on the config field
     *   DashboardInput: {
     *     config: KEEP,
     *   },
     *
     *   // Nested configuration for complex input types
     *   UserInput: {
     *     profile: {
     *       settings: KEEP,
     *     },
     *   },
     * };
     * ```
     */
    interface KeepTypenameConfig {
        [key: string]: typeof KEEP | RemoveTypenameFromVariablesLink.KeepTypenameConfig;
    }
    /**
     * Options for configuring the `RemoveTypenameFromVariablesLink`.
     */
    interface Options {
        /**
         * Configuration that determines which input types should retain `__typename`
         * fields.
         *
         * Maps GraphQL input type names to configurations. Each configuration can
         * either be the `KEEP` sentinel, to preserve all `__typename` fields, or
         * a nested object that specifies which fields should retain `__typename`.
         *
         * @example
         *
         * ```ts
         * {
         *   except: {
         *     // Keep __typename for all JSON scalar variables
         *     JSON: KEEP,
         *
         *     // For DashboardInput, remove __typename except for config field
         *     DashboardInput: {
         *       config: KEEP,
         *     },
         *
         *     // Complex nested configuration
         *     UserProfileInput: {
         *       settings: {
         *         preferences: KEEP,
         *       },
         *     },
         *   },
         * }
         * ```
         */
        except?: RemoveTypenameFromVariablesLink.KeepTypenameConfig;
    }
}
/**
 * @deprecated
 * Use `RemoveTypenameFromVariablesLink` from `@apollo/client/link/remove-typename` instead.
 */
export declare function removeTypenameFromVariables(options?: RemoveTypenameFromVariablesLink.Options): RemoveTypenameFromVariablesLink;
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
export declare class RemoveTypenameFromVariablesLink extends ApolloLink {
    constructor(options?: RemoveTypenameFromVariablesLink.Options);
    private maybeStripTypenameUsingConfig;
    private maybeStripTypename;
    private getVariableDefinitions;
}
//# sourceMappingURL=removeTypenameFromVariables.d.cts.map
