"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBranded = isBranded;
exports.brand = brand;
function isBranded(error, name) {
    return (typeof error === "object" &&
        error !== null &&
        error[Symbol.for("apollo.error")] === name);
}
function brand(error) {
    Object.defineProperty(error, Symbol.for("apollo.error"), {
        value: error.name,
        enumerable: false,
        writable: false,
        configurable: false,
    });
}
//# sourceMappingURL=utils.cjs.map
