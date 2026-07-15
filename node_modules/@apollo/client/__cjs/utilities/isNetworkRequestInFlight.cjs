"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNetworkRequestInFlight = isNetworkRequestInFlight;
const isNetworkRequestSettled_js_1 = require("./isNetworkRequestSettled.cjs");
/**
 * Returns true if there is currently a network request in flight according to a given network
 * status.
 */
function isNetworkRequestInFlight(networkStatus) {
    return !(0, isNetworkRequestSettled_js_1.isNetworkRequestSettled)(networkStatus);
}
//# sourceMappingURL=isNetworkRequestInFlight.cjs.map
