"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invariant = void 0;
const tslib_1 = require("tslib");
const dev_1 = require("@apollo/client/dev");
// eslint-disable-next-line no-restricted-syntax
tslib_1.__exportStar(require("./index.cjs"), exports);
// eslint-disable-next-line local-rules/import-from-export
const index_js_1 = require("./index.cjs");
exports.invariant = (() => {
    // side effects in an IIFE
    (0, dev_1.loadDevMessages)();
    (0, dev_1.loadErrorMessages)();
    return index_js_1.invariant;
})();
//# sourceMappingURL=index.development.cjs.map
