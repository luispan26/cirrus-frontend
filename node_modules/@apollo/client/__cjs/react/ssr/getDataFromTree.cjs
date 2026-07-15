"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDataFromTree = getDataFromTree;
exports.getMarkupFromTree = getMarkupFromTree;
const prerenderStatic_js_1 = require("./prerenderStatic.cjs");
/**
 * @deprecated This function uses the legacy `renderToStaticMarkup` API from React.
 * Use `prerenderStatic` instead, which can be configured to run with more modern
 * React APIs.
 */
async function getDataFromTree(tree, context = {}) {
    return getMarkupFromTree({
        tree,
        context,
        // If you need to configure this renderFunction, call getMarkupFromTree
        // directly instead of getDataFromTree.
        renderFunction: (await import("react-dom/server")).renderToStaticMarkup,
    });
}
/**
 * @deprecated This function is only compatible with legacy React prerendering APIs.
 * Use `prerenderStatic` instead, which can be configured to run with more modern
 * React APIs.
 */
async function getMarkupFromTree(
    { tree, context = {}, 
    // The rendering function is configurable! We use renderToStaticMarkup as
    // the default, because it's a little less expensive than renderToString,
    // and legacy usage of getDataFromTree ignores the return value anyway.
    renderFunction, }
) {
    if (!renderFunction) {
        renderFunction = (await import("react-dom/server")).renderToStaticMarkup;
    }
    const { result } = await (0, prerenderStatic_js_1.prerenderStatic)({
        tree,
        context,
        renderFunction,
        maxRerenders: Number.POSITIVE_INFINITY,
    });
    return result;
}
//# sourceMappingURL=getDataFromTree.cjs.map
