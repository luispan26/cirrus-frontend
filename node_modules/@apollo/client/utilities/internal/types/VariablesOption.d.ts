import type { OperationVariables } from "@apollo/client";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export type VariablesOption<TVariables extends OperationVariables> = {} extends TVariables ? {
    /**
    * An object containing all of the GraphQL variables your query requires to execute.
    * 
    * Each key in the object corresponds to a variable name, and that key's value corresponds to the variable value.
    * 
    * @docGroup 1. Operation options
    */
    variables?: TVariables;
} : {
    /**
    * An object containing all of the GraphQL variables your query requires to execute.
    * 
    * Each key in the object corresponds to a variable name, and that key's value corresponds to the variable value.
    * 
    * @docGroup 1. Operation options
    */
    variables: TVariables;
};
//# sourceMappingURL=VariablesOption.d.ts.map
