import type { HKT } from "@apollo/client/utilities";
import type { ApplyHKT } from "./ApplyHKT.js";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export type ApplyHKTImplementationWithDefault<Implementation, Name extends string, DefaultImplementation extends Record<Name, HKT>, arg1, arg2 = never, arg3 = never, arg4 = never> = ApplyHKT<Implementation extends {
    [name in Name]: infer Implementation extends HKT;
} ? Implementation : DefaultImplementation[Name], arg1, arg2, arg3, arg4>;
//# sourceMappingURL=ApplyHKTImplementationWithDefault.d.ts.map
