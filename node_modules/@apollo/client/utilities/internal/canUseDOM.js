import { maybe } from "@apollo/client/utilities/internal/globals";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export const canUseDOM = typeof maybe(() => window.document.createElement) === "function";
//# sourceMappingURL=canUseDOM.js.map
