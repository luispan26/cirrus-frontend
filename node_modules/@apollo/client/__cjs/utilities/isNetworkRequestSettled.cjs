"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNetworkRequestSettled = isNetworkRequestSettled;
/**
 * Returns true if the network request is in ready or error state according to a given network
 * status.
 */
function isNetworkRequestSettled(networkStatus) {
    return networkStatus === 7 || networkStatus === 8;
}
//# sourceMappingURL=isNetworkRequestSettled.cjs.map
