import type { ApolloClient } from "@apollo/client";
import type { Prettify } from "@apollo/client/utilities/internal";
export declare namespace DeclareDefaultOptions {
    interface WatchQuery {
    }
    interface Query {
    }
    interface Mutate {
    }
}
type PropertiesWithChildRequiredKeys<T extends Record<string, unknown>> = keyof T extends infer K ? K extends keyof T ? {} extends T[K] ? never : K : never : never;
type RequirePropertiesWithChildRequiredKeys<T extends Record<string, unknown>> = Prettify<T & Pick<Required<T>, PropertiesWithChildRequiredKeys<T>>>;
export interface DefaultOptionsParentObject extends RequirePropertiesWithChildRequiredKeys<{
    /**
     * Provide this object to set application-wide default values for options you can provide to the `watchQuery`, `query`, and `mutate` functions. See below for an example object.
     *
     * See this [example object](https://www.apollographql.com/docs/react/api/core/ApolloClient#example-defaultoptions-object).
     */
    defaultOptions?: ApolloClient.DefaultOptions.Input;
}> {
}
/**
 * Possible default options for ApolloClient instances.
 */
export interface DefaultOptions {
    watchQuery?: DefaultOptions.WatchQuery;
    query?: DefaultOptions.Query;
    mutate?: DefaultOptions.Mutate;
}
export declare namespace DefaultOptions {
    interface Input extends RequirePropertiesWithChildRequiredKeys<{
        watchQuery?: DefaultOptions.WatchQuery.Input;
        query?: DefaultOptions.Query.Input;
        mutate?: DefaultOptions.Mutate.Input;
    }> {
    }
    type _WatchQuery = DefaultOptions.WatchQuery.Input & PossibleDefaultOptions.WatchQuery;
    interface WatchQuery extends _WatchQuery {
    }
    namespace WatchQuery {
        type Calculated = Calculate<ApolloClient.DeclareDefaultOptions.WatchQuery, {
            errorPolicy: "none";
            returnPartialData: false;
        }>;
        interface Input extends RequireDefaultOptionDeclarations<PossibleDefaultOptions.WatchQuery, DeclareDefaultOptions.WatchQuery, "watchQuery", "errorPolicy" | "returnPartialData"> {
        }
    }
    type _Query = DefaultOptions.Query.Input & PossibleDefaultOptions.Query;
    interface Query extends _Query {
    }
    namespace Query {
        type Calculated = Calculate<ApolloClient.DeclareDefaultOptions.Query, {
            errorPolicy: "none";
        }>;
        interface Input extends RequireDefaultOptionDeclarations<PossibleDefaultOptions.Query, DeclareDefaultOptions.Query, "query", "errorPolicy"> {
        }
    }
    type _Mutate = DefaultOptions.Mutate.Input & PossibleDefaultOptions.Mutate;
    interface Mutate extends _Mutate {
    }
    namespace Mutate {
        type Calculated = Calculate<ApolloClient.DeclareDefaultOptions.Mutate, {
            errorPolicy: "none";
        }>;
        interface Input extends RequireDefaultOptionDeclarations<PossibleDefaultOptions.Mutate, DeclareDefaultOptions.Mutate, "mutate", "errorPolicy"> {
        }
    }
}
type Calculate<UserDefaults, BaseDefaults> = {
    [K in keyof BaseDefaults]: K extends keyof UserDefaults ? undefined extends UserDefaults[K] ? BaseDefaults[K] | Exclude<UserDefaults[K], undefined> : UserDefaults[K] : BaseDefaults[K];
};
/**
* @internal
* Exported as `InternalTypes.PossibleDefaultOptions`.
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare namespace PossibleDefaultOptions {
    interface WatchQuery extends Partial<ApolloClient.WatchQueryOptions<any, any>> {
    }
    interface Query extends Partial<ApolloClient.QueryOptions<any, any>> {
    }
    interface Mutate extends Partial<ApolloClient.MutateOptions<any, any, any>> {
    }
}
type RequireDefaultOptionDeclarations<Target, DeclarationInterface, TargetName extends string, RequiredDeclarations extends keyof Target & string> = Prettify<Partial<Omit<Target, Exclude<RequiredDeclarations, keyof DeclarationInterface>>> & DeclarationInterface & {
    [K in Exclude<RequiredDeclarations, keyof DeclarationInterface>]?: `A default option for ${TargetName}.${string & K} must be declared in ApolloClient.DeclareDefaultOptions before usage. See https://www.apollographql.com/docs/react/data/typescript#declaring-default-options-for-type-safety.`;
}>;
export {};
//# sourceMappingURL=defaultOptions.d.cts.map
