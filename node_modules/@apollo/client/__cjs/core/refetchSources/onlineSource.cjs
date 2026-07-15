"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onlineSource = void 0;
const rxjs_1 = require("rxjs");
const internal_1 = require("@apollo/client/utilities/internal");
const onlineSource = () => {
    return internal_1.canUseDOM ? (0, rxjs_1.fromEvent)(window, "online") : rxjs_1.EMPTY;
};
exports.onlineSource = onlineSource;
//# sourceMappingURL=onlineSource.cjs.map
