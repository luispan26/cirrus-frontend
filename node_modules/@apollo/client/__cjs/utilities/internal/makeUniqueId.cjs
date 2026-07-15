"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeUniqueId = makeUniqueId;
const prefixCounts = new Map();
/**
* These IDs won't be globally unique, but they will be unique within this
* process, thanks to the counter, and unguessable thanks to the random suffix.
*
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function makeUniqueId(prefix) {
    const count = prefixCounts.get(prefix) || 1;
    prefixCounts.set(prefix, count + 1);
    return `${prefix}:${count}:${Math.random().toString(36).slice(2)}`;
}
//# sourceMappingURL=makeUniqueId.cjs.map
