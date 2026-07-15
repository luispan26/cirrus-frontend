"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeDeep = mergeDeep;
const mergeDeepArray_js_1 = require("./mergeDeepArray.cjs");
// These mergeDeep and mergeDeepArray utilities merge any number of objects
// together, sharing as much memory as possible with the source objects, while
// remaining careful to avoid modifying any source objects.
// Logically, the return type of mergeDeep should be the intersection of
// all the argument types. The binary call signature is by far the most
// common, but we support 0- through 5-ary as well. After that, the
// resulting type is just the inferred array element type. Note to nerds:
// there is a more clever way of doing this that converts the tuple type
// first to a union type (easy enough: T[number]) and then converts the
// union to an intersection type using distributive conditional type
// inference, but that approach has several fatal flaws (boolean becomes
// true & false, and the inferred type ends up as unknown in many cases),
// in addition to being nearly impossible to explain/understand.
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function mergeDeep(...sources) {
    return (0, mergeDeepArray_js_1.mergeDeepArray)(sources);
}
//# sourceMappingURL=mergeDeep.cjs.map
