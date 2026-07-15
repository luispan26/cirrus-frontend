"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInMemoryCacheMemoryInternals = exports.getApolloClientMemoryInternals = exports.getApolloCacheMemoryInternals = void 0;
const tslib_1 = require("tslib");
// eslint-disable-next-line no-restricted-syntax
tslib_1.__exportStar(require("./index.cjs"), exports);
function unsupported() {
    throw new Error("only supported in development mode");
}
exports.getApolloCacheMemoryInternals = unsupported, exports.getApolloClientMemoryInternals = unsupported, exports.getInMemoryCacheMemoryInternals = unsupported;
//# sourceMappingURL=index.production.cjs.map
