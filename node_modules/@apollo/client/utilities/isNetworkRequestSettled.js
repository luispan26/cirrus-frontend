/**
 * Returns true if the network request is in ready or error state according to a given network
 * status.
 */
export function isNetworkRequestSettled(networkStatus) {
    return networkStatus === 7 || networkStatus === 8;
}
//# sourceMappingURL=isNetworkRequestSettled.js.map