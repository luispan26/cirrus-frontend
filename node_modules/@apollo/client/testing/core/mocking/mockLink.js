import { equal } from "@wry/equality";
import { asapScheduler, Observable, observeOn, throwError } from "rxjs";
import { ApolloLink } from "@apollo/client/link";
import { addTypenameToDocument, print } from "@apollo/client/utilities";
import { checkDocument, cloneDeep, getDefaultValues, getOperationDefinition, isDocumentNode, makeUniqueId, removeDirectivesFromDocument, } from "@apollo/client/utilities/internal";
import { invariant } from "@apollo/client/utilities/invariant";
export function realisticDelay({ min = 20, max = 50, } = {}) {
    invariant(max > min, 21);
    return () => Math.floor(Math.random() * (max - min) + min);
}
export class MockLink extends ApolloLink {
    operation;
    showWarnings = true;
    defaultDelay;
    mockedResponsesByKey = {};
    static defaultOptions = {
        delay: realisticDelay(),
    };
    constructor(mockedResponses, options = {}) {
        super();
        const defaultOptions = options.defaultOptions ?? MockLink.defaultOptions;
        this.showWarnings = options.showWarnings ?? true;
        this.defaultDelay = defaultOptions?.delay ?? realisticDelay();
        if (mockedResponses) {
            mockedResponses.forEach((mockedResponse) => {
                this.addMockedResponse(mockedResponse);
            });
        }
    }
    addMockedResponse(mockedResponse) {
        validateMockedResponse(mockedResponse);
        const normalized = this.normalizeMockedResponse(mockedResponse);
        this.getMockedResponses(normalized.request).push(normalized);
    }
    request(operation) {
        this.operation = operation;
        const unmatchedVars = [];
        const mocks = this.getMockedResponses(operation);
        const index = mocks.findIndex((mock) => {
            const { variables } = mock.request;
            if (typeof variables === "function") {
                const matched = variables(operation.variables);
                if (!matched) {
                    unmatchedVars.push(`<function ${variables.name}>`);
                }
                return matched;
            }
            const withDefaults = mock.variablesWithDefaults;
            if (equal(withDefaults, operation.variables)) {
                return true;
            }
            unmatchedVars.push(
            // Include default variables from the query in unmatched variables
            // output
            Object.keys(withDefaults).length > 0 ?
                withDefaults
                : variables || "<undefined>");
            return false;
        });
        const matched = index >= 0 ? mocks[index] : void 0;
        if (!matched) {
            const message = getErrorMessage(operation, unmatchedVars);
            if (this.showWarnings) {
                console.warn(message +
                    "\nThis typically indicates a configuration error in your mocks " +
                    "setup, usually due to a typo or mismatched variable.");
            }
            return throwError(() => new Error(message)).pipe(observeOn(asapScheduler));
        }
        if (matched.maxUsageCount > 1) {
            matched.maxUsageCount--;
        }
        else {
            mocks.splice(index, 1);
        }
        const delay = typeof matched.delay === "function" ?
            matched.delay(operation)
            : matched.delay;
        if (!matched.result && !matched.error && delay !== Infinity) {
            return throwError(() => new Error(`Mocked response should contain either \`result\`, \`error\` or a \`delay\` of \`Infinity\`:\n${stringifyMockedResponse(matched.original)}`));
        }
        if (matched.delay === Infinity) {
            return new Observable();
        }
        return new Observable((observer) => {
            const timer = setTimeout(() => {
                if (matched.error) {
                    return observer.error(matched.error);
                }
                if (matched.result) {
                    observer.next(typeof matched.result === "function" ?
                        matched.result(operation.variables)
                        : matched.result);
                }
                observer.complete();
            }, delay);
            return () => {
                clearTimeout(timer);
            };
        });
    }
    getMockedResponses(request) {
        const key = JSON.stringify({
            query: print(addTypenameToDocument(request.query)),
        });
        let mockedResponses = this.mockedResponsesByKey[key];
        if (!mockedResponses) {
            mockedResponses = this.mockedResponsesByKey[key] = [];
        }
        return mockedResponses;
    }
    normalizeMockedResponse(mockedResponse) {
        const { request } = mockedResponse;
        const response = cloneDeep(mockedResponse);
        response.original = mockedResponse;
        response.request.query = getServerQuery(request.query);
        response.maxUsageCount ??= 1;
        response.variablesWithDefaults = {
            ...getDefaultValues(getOperationDefinition(request.query)),
            ...request.variables,
        };
        response.delay ??= this.defaultDelay;
        return response;
    }
}
function getErrorMessage(operation, unmatchedVars) {
    return `No more mocked responses for the query:
${print(operation.query)}

Request variables: ${stringifyForDebugging(operation.variables)}
${unmatchedVars.length > 0 ?
        `
Failed to match variables against ${unmatchedVars.length} mock${unmatchedVars.length === 1 ? "" : "s"} for this query. The available mocks had the following variables:
${unmatchedVars.map((d) => `  ${stringifyForDebugging(d)}`).join("\n")}
`
        : ""}`;
}
function getServerQuery(query) {
    const queryWithoutClientOnlyDirectives = removeDirectivesFromDocument([{ name: "connection" }, { name: "nonreactive" }, { name: "unmask" }], query);
    invariant(queryWithoutClientOnlyDirectives, 22);
    const serverQuery = removeDirectivesFromDocument([{ name: "client", remove: true }], queryWithoutClientOnlyDirectives);
    invariant(serverQuery, 23);
    return serverQuery;
}
function validateMockedResponse(mock) {
    checkDocument(mock.request.query);
    invariant((mock.maxUsageCount ?? 1) > 0, 24, mock.maxUsageCount);
}
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function stringifyMockedResponse(mockedResponse) {
    return JSON.stringify(mockedResponse, (_, value) => {
        if (isDocumentNode(value)) {
            return print(value);
        }
        if (typeof value === "function") {
            return "<function>";
        }
        return value;
    }, 2);
}
// This is similar to the stringifyForDisplay utility we ship, but includes
// support for NaN in addition to undefined. More values may be handled in the
// future. This is not added to the primary stringifyForDisplay helper since it
// is used for the cache and other purposes. We need this for debugging only.
function stringifyForDebugging(value, space = 0) {
    if (typeof value === "string") {
        return value;
    }
    const undefId = makeUniqueId("undefined");
    const nanId = makeUniqueId("NaN");
    return JSON.stringify(value, (_, value) => {
        if (value === void 0) {
            return undefId;
        }
        if (Number.isNaN(value)) {
            return nanId;
        }
        return value;
    }, space)
        .replace(new RegExp(JSON.stringify(undefId), "g"), "<undefined>")
        .replace(new RegExp(JSON.stringify(nanId), "g"), "NaN");
}
//# sourceMappingURL=mockLink.js.map
