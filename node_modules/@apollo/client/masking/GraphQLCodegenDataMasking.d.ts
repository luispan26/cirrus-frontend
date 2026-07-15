import type { HKT } from "@apollo/client/utilities";
import type { IsAny } from "@apollo/client/utilities/internal";
import type { ContainsFragmentsRefs, RemoveFragmentName, UnwrapFragmentRefs } from "./internal/types.js";
export declare namespace GraphQLCodegenDataMasking {
    interface TypeOverrides {
        FragmentType: HKTImplementation.FragmentType;
        MaybeMasked: HKTImplementation.MaybeMasked;
        Unmasked: HKTImplementation.Unmasked;
    }
    namespace HKTImplementation {
        interface FragmentType extends HKT {
            arg1: unknown;
            return: GraphQLCodegenDataMasking.FragmentType<this["arg1"]>;
        }
        interface MaybeMasked extends HKT {
            arg1: unknown;
            return: GraphQLCodegenDataMasking.MaybeMasked<this["arg1"]>;
        }
        interface Unmasked extends HKT {
            arg1: unknown;
            return: GraphQLCodegenDataMasking.Unmasked<this["arg1"]>;
        }
    }
    type FragmentType<TData> = [
        TData
    ] extends [{
        " $fragmentName"?: infer TKey;
    }] ? TKey extends string ? {
        " $fragmentRefs"?: {
            [key in TKey]: TData;
        };
    } : never : never;
    /**
     * Unwraps the type to its masked type.
     *
     * @remarks
     * GraphQL Codegen generates types as masked types. The implementation is an
     * identity type.
     */
    type MaybeMasked<TData> = TData;
    /**
     * Unmasks a type to provide its full result.
     */
    type Unmasked<TData> = true extends IsAny<TData> ? TData : TData extends object ? true extends ContainsFragmentsRefs<TData> ? UnwrapFragmentRefs<RemoveFragmentName<TData>> : TData : TData;
}
//# sourceMappingURL=GraphQLCodegenDataMasking.d.ts.map