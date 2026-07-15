"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderToStringWithData = renderToStringWithData;
const prerenderStatic_js_1 = require("./prerenderStatic.cjs");
/**
 * @deprecated This function uses the legacy `renderToString` API from React.
 * Use `prerenderStatic` instead, which can be configured to run with more modern
 * React APIs.
 */
async function renderToStringWithData(component) {
    const { result } = await (0, prerenderStatic_js_1.prerenderStatic)({
        tree: component,
        renderFunction: (await import("react-dom/server")).renderToString,
        maxRerenders: Number.POSITIVE_INFINITY,
    });
    return result;
}
//# sourceMappingURL=renderToStringWithData.cjs.map
