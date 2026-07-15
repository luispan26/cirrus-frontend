import { invariant } from "@apollo/client/utilities/invariant";
import { getOperationDefinition } from "./getOperationDefinition.js";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function getQueryDefinition(doc) {
    const queryDef = getOperationDefinition(doc);
    invariant(queryDef && queryDef.operation === "query", 13);
    return queryDef;
}
//# sourceMappingURL=getQueryDefinition.js.map
