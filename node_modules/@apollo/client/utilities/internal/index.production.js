// eslint-disable-next-line no-restricted-syntax
export * from "./index.js";
function unsupported() {
    throw new Error("only supported in development mode");
}
export const getApolloCacheMemoryInternals = unsupported, getApolloClientMemoryInternals = unsupported, getInMemoryCacheMemoryInternals = unsupported;
//# sourceMappingURL=index.production.js.map