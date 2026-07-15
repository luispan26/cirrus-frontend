import { hasDirectives } from "@apollo/client/utilities/internal";
import { invariant } from "@apollo/client/utilities/invariant";
export class NotImplementedHandler {
    isIncrementalResult(_) {
        return false;
    }
    prepareRequest(request) {
        invariant(!hasDirectives(["defer", "stream"], request.query), 67);
        return request;
    }
    extractErrors() { }
    // This code path can never be reached, so we won't implement it.
    startRequest = undefined;
}
//# sourceMappingURL=notImplemented.js.map
