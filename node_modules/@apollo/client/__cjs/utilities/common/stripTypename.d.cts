/**
 * Deeply removes all `__typename` properties in the given object or array.
 *
 * @param value - The object or array that should have `__typename` removed.
 * @returns The object with all `__typename` properties removed.
 *
 * @example
 *
 * ```ts
 * stripTypename({
 *   __typename: "User",
 *   id: 1,
 *   profile: { __typename: "Profile", name: "John Doe" },
 * });
 * // => { id: 1, profile: { name: "John Doe"}}
 * ```
 */
export declare function stripTypename<T>(value: T): import("@apollo/client/utilities/internal").DeepOmit<T, "__typename">;
//# sourceMappingURL=stripTypename.d.cts.map
