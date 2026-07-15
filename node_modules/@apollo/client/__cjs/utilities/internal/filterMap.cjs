"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterMap = filterMap;
const rxjs_1 = require("rxjs");
function filterMap(fn, makeContext = () => undefined) {
    return (source) => new rxjs_1.Observable((subscriber) => {
        let context = makeContext();
        return source.subscribe({
            next(value) {
                let result;
                try {
                    result = fn(value, context);
                }
                catch (e) {
                    subscriber.error(e);
                }
                if (result === undefined) {
                    return;
                }
                subscriber.next(result);
            },
            error(err) {
                subscriber.error(err);
            },
            complete() {
                subscriber.complete();
            },
        });
    });
}
//# sourceMappingURL=filterMap.cjs.map
