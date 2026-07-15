"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultPrinter = exports.fallbackHttpConfig = void 0;
exports.selectHttpOptionsAndBody = selectHttpOptionsAndBody;
exports.selectHttpOptionsAndBodyInternal = selectHttpOptionsAndBodyInternal;
const utilities_1 = require("@apollo/client/utilities");
const defaultHttpOptions = {
    includeQuery: true,
    includeExtensions: true,
    preserveHeaderCase: false,
};
const defaultHeaders = {
    // headers are case insensitive (https://stackoverflow.com/a/5259004)
    accept: "application/graphql-response+json,application/json;q=0.9",
    // The content-type header describes the type of the body of the request, and
    // so it typically only is sent with requests that actually have bodies. One
    // could imagine that Apollo Client would remove this header when constructing
    // a GET request (which has no body), but we historically have not done that.
    // This means that browsers will preflight all Apollo Client requests (even
    // GET requests). Apollo Server's CSRF prevention feature (introduced in
    // AS3.7) takes advantage of this fact and does not block requests with this
    // header. If you want to drop this header from GET requests, then you should
    // probably replace it with a `apollo-require-preflight` header, or servers
    // with CSRF prevention enabled might block your GET request. See
    // https://www.apollographql.com/docs/apollo-server/security/cors/#preventing-cross-site-request-forgery-csrf
    // for more details.
    "content-type": "application/json",
};
const defaultOptions = {
    method: "POST",
};
exports.fallbackHttpConfig = {
    http: defaultHttpOptions,
    headers: defaultHeaders,
    options: defaultOptions,
};
const defaultPrinter = (ast, printer) => printer(ast);
exports.defaultPrinter = defaultPrinter;
function selectHttpOptionsAndBody(operation, fallbackConfig, ...configs) {
    configs.unshift(fallbackConfig);
    return selectHttpOptionsAndBodyInternal(operation, exports.defaultPrinter, ...configs);
}
function selectHttpOptionsAndBodyInternal(operation, printer, ...configs) {
    let options = {};
    let http = {};
    configs.forEach((config) => {
        options = {
            ...options,
            ...config.options,
            headers: {
                ...options.headers,
                ...config.headers,
            },
        };
        if (config.credentials) {
            options.credentials = config.credentials;
        }
        options.headers.accept = (config.http?.accept || [])
            .concat(options.headers.accept)
            .join(",");
        http = {
            ...http,
            ...config.http,
        };
    });
    options.headers = removeDuplicateHeaders(options.headers, http.preserveHeaderCase);
    //The body depends on the http options
    const { operationName, extensions, variables, query } = operation;
    const body = { operationName, variables };
    if (http.includeExtensions && Object.keys(extensions || {}).length)
        body.extensions = extensions;
    // not sending the query (i.e persisted queries)
    if (http.includeQuery)
        body.query = printer(query, utilities_1.print);
    return {
        options,
        body,
    };
}
// Remove potential duplicate header names, preserving last (by insertion order).
// This is done to prevent unintentionally duplicating a header instead of
// overwriting it (See #8447 and #8449).
function removeDuplicateHeaders(headers, preserveHeaderCase) {
    // If we're not preserving the case, just remove duplicates w/ normalization.
    if (!preserveHeaderCase) {
        const normalizedHeaders = {};
        Object.keys(Object(headers)).forEach((name) => {
            normalizedHeaders[name.toLowerCase()] = headers[name];
        });
        return normalizedHeaders;
    }
    // If we are preserving the case, remove duplicates w/ normalization,
    // preserving the original name.
    // This allows for non-http-spec-compliant servers that expect intentionally
    // capitalized header names (See #6741).
    const headerData = {};
    Object.keys(Object(headers)).forEach((name) => {
        headerData[name.toLowerCase()] = {
            originalName: name,
            value: headers[name],
        };
    });
    const normalizedHeaders = {};
    Object.keys(headerData).forEach((name) => {
        normalizedHeaders[headerData[name].originalName] = headerData[name].value;
    });
    return normalizedHeaders;
}
//# sourceMappingURL=selectHttpOptionsAndBody.cjs.map
