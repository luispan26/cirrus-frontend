"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinalizationRegistry = void 0;
const invariant_1 = require("@apollo/client/utilities/invariant");
/**
* @internal
*
* An approximation of `FinalizationRegistry` based on `WeakRef`.
* While there are registered values, checks every 500ms if any have been garbage collected.
* The polling interval is cleared once all registered entries have been removed.
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
const FinalizationRegistry = class FinalizationRegistry {
    intervalLength = 500;
    callback;
    references = new Set();
    unregisterTokens = new WeakMap();
    interval = null;
    constructor(callback) {
        this.callback = callback;
        this.handler = this.handler.bind(this);
    }
    handler() {
        if (this.references.size === 0) {
            clearInterval(this.interval);
            this.interval = null;
            return;
        }
        this.references.forEach((entry) => {
            if (entry.targetRef.deref() === undefined) {
                this.references.delete(entry);
                // Spec deviation: Not catching errors here, might get necessary if used in more places.
                this.callback(entry.value);
            }
        });
    }
    register(target, value, unregisterToken) {
        const entry = { targetRef: new WeakRef(target), value };
        this.references.add(entry);
        if (unregisterToken) {
            // some simplifications here as it's an internal polyfill
            // we don't allow the same unregisterToken to be reused
            (0, invariant_1.invariant)(!this.unregisterTokens.has(unregisterToken));
            this.unregisterTokens.set(unregisterToken, entry);
        }
        if (!this.interval) {
            this.interval = setInterval(this.handler, this.intervalLength);
        }
    }
    unregister(unregisterToken) {
        // Calling `(weak)Set.delete(undefined)` is not covered by the TypeScript types,
        // but valid by the spec (see https://tc39.es/ecma262/multipage/keyed-collections.html#sec-weakset.prototype.delete).
        // Shaving a few bytes here by skipping the undefined check.
        this.references.delete(this.unregisterTokens.get(unregisterToken));
        return this.unregisterTokens.delete(unregisterToken);
    }
    [Symbol.toStringTag] = "FinalizationRegistry";
};
exports.FinalizationRegistry = FinalizationRegistry;
//# sourceMappingURL=FinalizationRegistry.cjs.map
