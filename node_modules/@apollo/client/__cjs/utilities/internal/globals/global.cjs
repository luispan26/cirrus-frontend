"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const maybe_js_1 = require("./maybe.cjs");
exports.default = ((0, maybe_js_1.maybe)(() => globalThis) ||
    (0, maybe_js_1.maybe)(() => window) ||
    (0, maybe_js_1.maybe)(() => self) ||
    (0, maybe_js_1.maybe)(() => global) ||
    // We don't expect the Function constructor ever to be invoked at runtime, as
    // long as at least one of globalThis, window, self, or global is defined, so
    // we are under no obligation to make it easy for static analysis tools to
    // detect syntactic usage of the Function constructor. If you think you can
    // improve your static analysis to detect this obfuscation, think again. This
    // is an arms race you cannot win, at least not in JavaScript.
    (0, maybe_js_1.maybe)(function () {
        return maybe_js_1.maybe.constructor("return this")();
    }));
//# sourceMappingURL=global.cjs.map
