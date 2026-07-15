import { isNonNullObject } from "./isNonNullObject.js";
const { hasOwnProperty } = Object.prototype;
const defaultReconciler = function (target, source, property) {
    return this.merge(target[property], source[property]);
};
const objForKey = (key) => {
    return isNaN(+key) ? {} : [];
};
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export class DeepMerger {
    options;
    reconciler;
    constructor(options = {}) {
        this.options = options;
        this.reconciler = options.reconciler || defaultReconciler;
    }
    merge(target, source, mergeOptions = {}) {
        const atPath = mergeOptions.atPath;
        if (atPath?.length) {
            const [head, ...tail] = atPath;
            if (target === undefined) {
                target = objForKey(head);
            }
            let nestedTarget = target[head];
            if (nestedTarget === undefined && tail.length) {
                nestedTarget = objForKey(tail[0]);
            }
            const nestedSource = this.merge(nestedTarget, source, {
                ...mergeOptions,
                atPath: tail,
            });
            if (nestedTarget !== nestedSource) {
                target = this.shallowCopyForMerge(target);
                target[head] = nestedSource;
            }
            return target;
        }
        if (Array.isArray(target) &&
            Array.isArray(source) &&
            this.options.arrayMerge === "truncate" &&
            target.length > source.length) {
            target = target.slice(0, source.length);
            this.pastCopies.add(target);
        }
        if (isNonNullObject(source) && isNonNullObject(target)) {
            Object.keys(source).forEach((sourceKey) => {
                if (hasOwnProperty.call(target, sourceKey)) {
                    const targetValue = target[sourceKey];
                    if (source[sourceKey] !== targetValue) {
                        const result = this.reconciler(target, source, sourceKey);
                        // A well-implemented reconciler may return targetValue to indicate
                        // the merge changed nothing about the structure of the target.
                        if (result !== targetValue) {
                            target = this.shallowCopyForMerge(target);
                            target[sourceKey] = result;
                        }
                    }
                }
                else {
                    // If there is no collision, the target can safely share memory with
                    // the source, and the recursion can terminate here.
                    target = this.shallowCopyForMerge(target);
                    target[sourceKey] = source[sourceKey];
                }
            });
            return target;
        }
        // If source (or target) is not an object, let source replace target.
        return source;
    }
    isObject = isNonNullObject;
    pastCopies = new Set();
    shallowCopyForMerge(value) {
        if (isNonNullObject(value)) {
            if (!this.pastCopies.has(value)) {
                if (Array.isArray(value)) {
                    value = value.slice(0);
                }
                else {
                    value = {
                        __proto__: Object.getPrototypeOf(value),
                        ...value,
                    };
                }
                this.pastCopies.add(value);
            }
        }
        return value;
    }
}
//# sourceMappingURL=DeepMerger.js.map
