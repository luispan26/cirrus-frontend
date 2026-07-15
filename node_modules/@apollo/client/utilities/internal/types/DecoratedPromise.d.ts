import type { FulfilledPromise } from "./FulfilledPromise.js";
import type { PendingPromise } from "./PendingPromise.js";
import type { RejectedPromise } from "./RejectedPromise.js";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export type DecoratedPromise<TValue> = PendingPromise<TValue> | FulfilledPromise<TValue> | RejectedPromise<TValue>;
//# sourceMappingURL=DecoratedPromise.d.ts.map
