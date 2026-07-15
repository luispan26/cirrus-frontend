import type { HKT } from "@apollo/client/utilities";
export declare namespace PreserveTypes {
    interface TypeOverrides {
        FragmentType: HKTImplementation.FragmentType;
        MaybeMasked: HKTImplementation.MaybeMasked;
        Unmasked: HKTImplementation.Unmasked;
    }
    namespace HKTImplementation {
        interface FragmentType extends HKT {
            arg1: unknown;
            return: never;
        }
        interface MaybeMasked extends HKT {
            arg1: unknown;
            return: this["arg1"];
        }
        interface Unmasked extends HKT {
            arg1: unknown;
            return: this["arg1"];
        }
    }
    type FragmentType<_TData> = never;
    type MaybeMasked<TData> = TData;
    type Unmasked<TData> = TData;
}
//# sourceMappingURL=PreserveTypes.d.ts.map