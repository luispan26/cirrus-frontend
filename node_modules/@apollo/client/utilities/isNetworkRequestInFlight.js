import { isNetworkRequestSettled } from "./isNetworkRequestSettled.js";
/**
 * Returns true if there is currently a network request in flight according to a given network
 * status.
 */
export function isNetworkRequestInFlight(networkStatus) {
    return !isNetworkRequestSettled(networkStatus);
}
//# sourceMappingURL=isNetworkRequestInFlight.js.map