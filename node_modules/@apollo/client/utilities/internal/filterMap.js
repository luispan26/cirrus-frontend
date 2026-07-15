import { Observable } from "rxjs";
export function filterMap(fn, makeContext = () => undefined) {
    return (source) => new Observable((subscriber) => {
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
//# sourceMappingURL=filterMap.js.map