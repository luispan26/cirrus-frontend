import { execute, validate } from "graphql";
import { Observable } from "rxjs";
import { ApolloLink } from "@apollo/client/link";
/**
 * `SchemaLink` is a terminating link that executes GraphQL operations against
 * a local GraphQL schema instead of making network requests. This is commonly
 * used for server-side rendering (SSR) and mocking data.
 *
 * > [!NOTE]
 * > While `SchemaLink` can provide GraphQL results on the client, the GraphQL
 * > execution layer is [quite large](https://bundlephobia.com/result?p=graphql) for practical client-side use.
 * > For client-side state management, consider Apollo Client's [local state management](https://apollographql.com/docs/react/local-state/local-state-management/)
 * > functionality instead, which integrates with the Apollo Client cache.
 *
 * @example
 *
 * ```ts
 * import { SchemaLink } from "@apollo/client/link/schema";
 * import schema from "./path/to/your/schema";
 *
 * const link = new SchemaLink({ schema });
 * ```
 */
export class SchemaLink extends ApolloLink {
    schema;
    rootValue;
    context;
    validate;
    constructor(options) {
        super();
        this.schema = options.schema;
        this.rootValue = options.rootValue;
        this.context = options.context;
        this.validate = !!options.validate;
    }
    request(operation) {
        return new Observable((observer) => {
            new Promise((resolve) => resolve(typeof this.context === "function" ?
                this.context(operation)
                : this.context))
                .then((context) => {
                if (this.validate) {
                    const validationErrors = validate(this.schema, operation.query);
                    if (validationErrors.length > 0) {
                        return { errors: validationErrors };
                    }
                }
                return execute({
                    schema: this.schema,
                    document: operation.query,
                    rootValue: this.rootValue,
                    contextValue: context,
                    variableValues: operation.variables,
                    operationName: operation.operationName,
                });
            })
                .then((data) => {
                if (!observer.closed) {
                    observer.next(data);
                    observer.complete();
                }
            })
                .catch((error) => {
                if (!observer.closed) {
                    observer.error(error);
                }
            });
        });
    }
}
//# sourceMappingURL=index.js.map