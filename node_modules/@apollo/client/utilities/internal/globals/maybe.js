export function maybe(thunk) {
    try {
        return thunk();
    }
    catch { }
}
//# sourceMappingURL=maybe.js.map