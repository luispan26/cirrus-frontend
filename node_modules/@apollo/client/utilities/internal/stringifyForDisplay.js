import { makeUniqueId } from "./makeUniqueId.js";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function stringifyForDisplay(value, space = 0) {
    const undefId = makeUniqueId("stringifyForDisplay");
    return JSON.stringify(value, (_, value) => {
        return value === void 0 ? undefId : value;
    }, space)
        .split(JSON.stringify(undefId))
        .join("<undefined>");
}
//# sourceMappingURL=stringifyForDisplay.js.map
