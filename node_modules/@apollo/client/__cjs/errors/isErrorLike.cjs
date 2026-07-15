"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isErrorLike = isErrorLike;
function isErrorLike(error) {
    return (error !== null &&
        typeof error === "object" &&
        typeof error.message === "string" &&
        typeof error.name === "string" &&
        (typeof error.stack === "string" ||
            typeof error.stack === "undefined"));
}
//# sourceMappingURL=isErrorLike.cjs.map
