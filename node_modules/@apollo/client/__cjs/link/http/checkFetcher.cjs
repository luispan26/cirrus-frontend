"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkFetcher = void 0;
const invariant_1 = require("@apollo/client/utilities/invariant");
const checkFetcher = (fetcher) => {
    (0, invariant_1.invariant)(fetcher || typeof fetch !== "undefined", 61);
};
exports.checkFetcher = checkFetcher;
//# sourceMappingURL=checkFetcher.cjs.map
