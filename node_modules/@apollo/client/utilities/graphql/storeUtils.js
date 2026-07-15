/**
 * Determines if a given object is a reference object.
 *
 * @param obj - The object to check if its a reference object
 *
 * @example
 *
 * ```ts
 * import { isReference } from "@apollo/client/utilities";
 *
 * isReference({ __ref: "User:1" }); // true
 * isReference({ __typename: "User", id: 1 }); // false
 * ```
 */
export function isReference(obj) {
    return Boolean(obj && typeof obj === "object" && typeof obj.__ref === "string");
}
//# sourceMappingURL=storeUtils.js.map