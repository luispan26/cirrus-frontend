"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeDeepArray = mergeDeepArray;
const DeepMerger_js_1 = require("./DeepMerger.cjs");
// In almost any situation where you could succeed in getting the
// TypeScript compiler to infer a tuple type for the sources array, you
// could just use mergeDeep instead of mergeDeepArray, so instead of
// trying to convert T[] to an intersection type we just infer the array
// element type, which works perfectly when the sources array has a
// consistent element type.
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function mergeDeepArray(sources) {
    let target = sources[0] || {};
    const count = sources.length;
    if (count > 1) {
        const merger = new DeepMerger_js_1.DeepMerger();
        for (let i = 1; i < count; ++i) {
            target = merger.merge(target, sources[i]);
        }
    }
    return target;
}
//# sourceMappingURL=mergeDeepArray.cjs.map
