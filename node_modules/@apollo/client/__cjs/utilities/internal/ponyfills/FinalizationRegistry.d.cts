/**
* @internal
*
* An approximation of `FinalizationRegistry` based on `WeakRef`.
* While there are registered values, checks every 500ms if any have been garbage collected.
* The polling interval is cleared once all registered entries have been removed.
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare const FinalizationRegistry: typeof globalThis.FinalizationRegistry;
//# sourceMappingURL=FinalizationRegistry.d.cts.map
