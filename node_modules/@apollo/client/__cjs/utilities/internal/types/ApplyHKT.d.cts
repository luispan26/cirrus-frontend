import type { HKT } from "@apollo/client/utilities";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export type ApplyHKT<fn extends HKT, arg1, arg2 = never, arg3 = never, arg4 = never> = (fn & {
    arg1: arg1;
    arg2: arg2;
    arg3: arg3;
    arg4: arg4;
})["return"];
//# sourceMappingURL=ApplyHKT.d.cts.map
