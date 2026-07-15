import type { TupleToIntersection } from "./types/TupleToIntersection.js";
/**
* Merges the provided objects shallowly and removes
* all properties with an `undefined` value
*
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare function compact<TArgs extends any[]>(...objects: TArgs): TupleToIntersection<TArgs>;
//# sourceMappingURL=compact.d.ts.map
