import type { ApolloLink } from "@apollo/client/link";
import type { BaseHttpLink } from "./BaseHttpLink.js";
interface HttpConfig {
    http?: BaseHttpLink.HttpOptions;
    options?: any;
    headers?: Record<string, string>;
    credentials?: any;
}
export declare const fallbackHttpConfig: {
    http: BaseHttpLink.HttpOptions;
    headers: {
        accept: string;
        "content-type": string;
    };
    options: {
        method: string;
    };
};
export declare const defaultPrinter: BaseHttpLink.Printer;
export declare function selectHttpOptionsAndBody(operation: ApolloLink.Operation, fallbackConfig: HttpConfig, ...configs: Array<HttpConfig>): {
    options: HttpConfig & Record<string, any>;
    body: BaseHttpLink.Body;
};
export declare function selectHttpOptionsAndBodyInternal(operation: ApolloLink.Operation, printer: BaseHttpLink.Printer, ...configs: HttpConfig[]): {
    options: HttpConfig & Record<string, any>;
    body: BaseHttpLink.Body;
};
export {};
//# sourceMappingURL=selectHttpOptionsAndBody.d.ts.map