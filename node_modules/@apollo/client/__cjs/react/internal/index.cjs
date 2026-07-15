"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapperSymbol = exports.wrapQueryRef = exports.updateWrappedQueryRef = exports.unwrapQueryRef = exports.InternalQueryReference = exports.getWrappedPromise = exports.assertWrappedQueryRef = exports.getSuspenseCache = void 0;
var getSuspenseCache_js_1 = require("./cache/getSuspenseCache.cjs");
Object.defineProperty(exports, "getSuspenseCache", { enumerable: true, get: function () { return getSuspenseCache_js_1.getSuspenseCache; } });
var QueryReference_js_1 = require("./cache/QueryReference.cjs");
Object.defineProperty(exports, "assertWrappedQueryRef", { enumerable: true, get: function () { return QueryReference_js_1.assertWrappedQueryRef; } });
Object.defineProperty(exports, "getWrappedPromise", { enumerable: true, get: function () { return QueryReference_js_1.getWrappedPromise; } });
Object.defineProperty(exports, "InternalQueryReference", { enumerable: true, get: function () { return QueryReference_js_1.InternalQueryReference; } });
Object.defineProperty(exports, "unwrapQueryRef", { enumerable: true, get: function () { return QueryReference_js_1.unwrapQueryRef; } });
Object.defineProperty(exports, "updateWrappedQueryRef", { enumerable: true, get: function () { return QueryReference_js_1.updateWrappedQueryRef; } });
Object.defineProperty(exports, "wrapQueryRef", { enumerable: true, get: function () { return QueryReference_js_1.wrapQueryRef; } });
exports.wrapperSymbol = Symbol.for("apollo.hook.wrappers");
//# sourceMappingURL=index.cjs.map
