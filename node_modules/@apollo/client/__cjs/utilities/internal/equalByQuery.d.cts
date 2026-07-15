import type { DocumentNode } from "graphql";
import type { ObservableQuery } from "@apollo/client";
import type { OperationVariables } from "@apollo/client";
export declare function equalByQuery(query: DocumentNode, { data: aData, ...aRest }: Partial<ObservableQuery.Result<unknown>>, { data: bData, ...bRest }: Partial<ObservableQuery.Result<unknown>>, variables?: OperationVariables): boolean;
//# sourceMappingURL=equalByQuery.d.cts.map
