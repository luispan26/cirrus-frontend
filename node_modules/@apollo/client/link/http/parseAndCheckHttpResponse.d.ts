import type { ApolloLink } from "@apollo/client/link";
export declare function readMultipartBody<T extends object = Record<string, unknown>>(response: Response, nextValue: (value: T) => void): Promise<void>;
export declare function parseAndCheckHttpResponse(operations: ApolloLink.Operation | ApolloLink.Operation[]): (response: Response) => Promise<any>;
//# sourceMappingURL=parseAndCheckHttpResponse.d.ts.map