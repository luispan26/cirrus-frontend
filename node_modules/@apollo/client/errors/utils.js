export function isBranded(error, name) {
    return (typeof error === "object" &&
        error !== null &&
        error[Symbol.for("apollo.error")] === name);
}
export function brand(error) {
    Object.defineProperty(error, Symbol.for("apollo.error"), {
        value: error.name,
        enumerable: false,
        writable: false,
        configurable: false,
    });
}
//# sourceMappingURL=utils.js.map