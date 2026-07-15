import type * as ReactTypes from "react";
import { prerenderStatic } from "./prerenderStatic.js";
/**
 * @deprecated This function uses the legacy `renderToStaticMarkup` API from React.
 * Use `prerenderStatic` instead, which can be configured to run with more modern
 * React APIs.
 */
export declare function getDataFromTree(tree: ReactTypes.ReactNode, context?: {
    [key: string]: any;
}): Promise<string>;
type GetMarkupFromTreeOptions = {
    tree: ReactTypes.ReactNode;
    context?: {
        [key: string]: any;
    };
    renderFunction?: prerenderStatic.RenderToString | prerenderStatic.RenderToStringPromise;
};
/**
 * @deprecated This function is only compatible with legacy React prerendering APIs.
 * Use `prerenderStatic` instead, which can be configured to run with more modern
 * React APIs.
 */
export declare function getMarkupFromTree({ tree, context, renderFunction, }: GetMarkupFromTreeOptions): Promise<string>;
export {};
//# sourceMappingURL=getDataFromTree.d.ts.map