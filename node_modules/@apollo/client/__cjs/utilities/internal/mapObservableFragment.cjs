"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapObservableFragmentMemoized = void 0;
const rxjs_1 = require("rxjs");
const memoize_js_1 = require("./memoize.cjs");
function mapObservableFragment(observable, mapFn) {
    let currentResult;
    let stableMappedResult;
    function toMapped(result) {
        if (result !== currentResult) {
            currentResult = result;
            stableMappedResult = mapFn(currentResult);
        }
        return stableMappedResult;
    }
    return Object.assign(observable.pipe((0, rxjs_1.map)(toMapped), (0, rxjs_1.shareReplay)({ bufferSize: 1, refCount: true })), {
        getCurrentResult: () => toMapped(observable.getCurrentResult()),
    });
}
exports.mapObservableFragmentMemoized = (0, memoize_js_1.memoize)(function mapObservableFragmentMemoized(observable, 
/**
 * used together with `observable` as memoization key, `mapFn` is explicitly not used as memoization key
 */
_cacheKey, mapFn) {
    return mapObservableFragment(observable, mapFn);
}, { max: 1, makeCacheKey: (args) => args.slice(0, 2) });
//# sourceMappingURL=mapObservableFragment.cjs.map
