import type { BaseHttpLink } from "./BaseHttpLink.js";
export declare function rewriteURIForGET(chosenURI: string, body: BaseHttpLink.Body): {
    parseError: unknown;
    newURI?: undefined;
} | {
    newURI: string;
    parseError?: undefined;
};
//# sourceMappingURL=rewriteURIForGET.d.ts.map