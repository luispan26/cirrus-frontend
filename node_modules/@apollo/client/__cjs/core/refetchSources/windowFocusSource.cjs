"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.windowFocusSource = void 0;
const rxjs_1 = require("rxjs");
const internal_1 = require("@apollo/client/utilities/internal");
const windowFocusSource = () => {
    if (!internal_1.canUseDOM) {
        return rxjs_1.EMPTY;
    }
    return (0, rxjs_1.fromEvent)(window, "visibilitychange").pipe((0, rxjs_1.filter)(() => document.visibilityState === "visible"));
};
exports.windowFocusSource = windowFocusSource;
//# sourceMappingURL=windowFocusSource.cjs.map
