"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoreKeyName = void 0;
const canonicalStringify_js_1 = require("./canonicalStringify.cjs");
const KNOWN_DIRECTIVES = [
    "connection",
    "include",
    "skip",
    "client",
    "rest",
    "export",
    "nonreactive",
    "stream",
];
// Default stable JSON.stringify implementation used by getStoreKeyName. Can be
// updated/replaced with something better by calling
// getStoreKeyName.setStringify(newStringifyFunction).
let storeKeyNameStringify = canonicalStringify_js_1.canonicalStringify;
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
exports.getStoreKeyName = Object.assign(function (fieldName, args, directives) {
    if (args &&
        directives &&
        directives["connection"] &&
        directives["connection"]["key"]) {
        if (directives["connection"]["filter"] &&
            directives["connection"]["filter"].length > 0) {
            const filterKeys = directives["connection"]["filter"] ?
                directives["connection"]["filter"]
                : [];
            filterKeys.sort();
            const filteredArgs = {};
            filterKeys.forEach((key) => {
                filteredArgs[key] = args[key];
            });
            const stringifiedArgs = storeKeyNameStringify(filteredArgs);
            if (stringifiedArgs !== "{}") {
                return `${directives["connection"]["key"]}(${stringifiedArgs})`;
            }
        }
        return directives["connection"]["key"];
    }
    let completeFieldName = fieldName;
    if (args) {
        // We can't use `JSON.stringify` here since it's non-deterministic,
        // and can lead to different store key names being created even though
        // the `args` object used during creation has the same properties/values.
        const stringifiedArgs = storeKeyNameStringify(args);
        if (stringifiedArgs !== "{}") {
            completeFieldName += `(${stringifiedArgs})`;
        }
    }
    if (directives) {
        Object.keys(directives).forEach((key) => {
            if (KNOWN_DIRECTIVES.indexOf(key) !== -1)
                return;
            if (directives[key] && Object.keys(directives[key]).length) {
                completeFieldName += `@${key}(${storeKeyNameStringify(directives[key])})`;
            }
            else {
                completeFieldName += `@${key}`;
            }
        });
    }
    return completeFieldName;
}, {
    setStringify(s) {
        const previous = storeKeyNameStringify;
        storeKeyNameStringify = s;
        return previous;
    },
});
//# sourceMappingURL=getStoreKeyName.cjs.map
