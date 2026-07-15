import type { DocumentNode } from "graphql";
import type { SkipToken } from "@apollo/client/react";
import { useQuery } from "@apollo/client/react";
import type { PrerenderStaticInternalContext } from "./prerenderStatic.cjs";
export declare const useSSRQuery: (this: PrerenderStaticInternalContext, query: DocumentNode, options?: useQuery.Options<any, any> | SkipToken) => useQuery.Result<any, any>;
//# sourceMappingURL=useSSRQuery.d.cts.map
