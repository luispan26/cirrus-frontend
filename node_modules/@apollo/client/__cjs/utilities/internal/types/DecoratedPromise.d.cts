import type { FulfilledPromise } from "./FulfilledPromise.cjs";
import type { PendingPromise } from "./PendingPromise.cjs";
import type { RejectedPromise } from "./RejectedPromise.cjs";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export type DecoratedPromise<TValue> = PendingPromise<TValue> | FulfilledPromise<TValue> | RejectedPromise<TValue>;
//# sourceMappingURL=DecoratedPromise.d.cts.map
