import type { SelectionSetNode } from "graphql";
import type { ApolloCache } from "@apollo/client/cache";
import type { FragmentMap } from "@apollo/client/utilities/internal";
interface MaskingContext {
    operationType: "query" | "mutation" | "subscription" | "fragment";
    operationName: string | undefined;
    fragmentMap: FragmentMap;
    cache: ApolloCache;
    mutableTargets: WeakMap<any, any>;
    knownChanged: WeakSet<any>;
}
export declare function maskDefinition(data: Record<string, any>, selectionSet: SelectionSetNode, context: MaskingContext): any;
export {};
//# sourceMappingURL=maskDefinition.d.cts.map
