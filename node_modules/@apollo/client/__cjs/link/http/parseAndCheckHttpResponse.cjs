"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readMultipartBody = readMultipartBody;
exports.parseAndCheckHttpResponse = parseAndCheckHttpResponse;
const errors_1 = require("@apollo/client/errors");
const internal_1 = require("@apollo/client/utilities/internal");
const invariant_1 = require("@apollo/client/utilities/invariant");
const { hasOwnProperty } = Object.prototype;
/**
 * This function detects an Apollo payload result before it is transformed
 * into a FetchResult via HttpLink; it cannot detect an ApolloPayloadResult
 * once it leaves the link chain.
 */
function isApolloPayloadResult(value) {
    return (0, internal_1.isNonNullObject)(value) && "payload" in value;
}
async function* consumeMultipartBody(response) {
    const decoder = new TextDecoder("utf-8");
    const contentType = response.headers?.get("content-type");
    // parse boundary value and ignore any subsequent name/value pairs after ;
    // https://www.rfc-editor.org/rfc/rfc9110.html#name-parameters
    // e.g. multipart/mixed;boundary="graphql";deferSpec=20220824
    // if no boundary is specified, default to -
    const match = contentType?.match(
    /*
      ;\s*boundary=                # Match the boundary parameter
      (?:                          # either
        '([^']*)'                  # a string starting with ' doesn't contain ', ends with '
        |                          # or
        "([^"]*)"                  # a string starting with " doesn't contain ", ends with "
        |                          # or
        ([^"'].*?)                 # a string that doesn't start with ' or ", parsed non-greedily
        )                          # end of the group
      \s*                          # optional whitespace
      (?:;|$)                        # match a semicolon or end of string
    */
    /;\s*boundary=(?:'([^']+)'|"([^"]+)"|([^"'].+?))\s*(?:;|$)/i);
    const boundary = "\r\n--" + (match ? match[1] ?? match[2] ?? match[3] ?? "-" : "-");
    let buffer = "";
    (0, invariant_1.invariant)(response.body && typeof response.body.getReader === "function", 62);
    const stream = response.body;
    const reader = stream.getReader();
    let done = false;
    let encounteredBoundary = false;
    let value;
    // check to see if we received the final boundary, which is a normal boundary followed by "--"
    // as described in https://www.rfc-editor.org/rfc/rfc2046#section-5.1.1
    const passedFinalBoundary = () => encounteredBoundary && buffer[0] == "-" && buffer[1] == "-";
    try {
        while (!done) {
            ({ value, done } = await reader.read());
            const chunk = typeof value === "string" ? value : decoder.decode(value);
            const searchFrom = buffer.length - boundary.length + 1;
            buffer += chunk;
            let bi = buffer.indexOf(boundary, searchFrom);
            while (bi > -1 && !passedFinalBoundary()) {
                encounteredBoundary = true;
                let message;
                [message, buffer] = [
                    buffer.slice(0, bi),
                    buffer.slice(bi + boundary.length),
                ];
                const i = message.indexOf("\r\n\r\n");
                const headers = parseHeaders(message.slice(0, i));
                const contentType = headers["content-type"];
                if (contentType &&
                    contentType.toLowerCase().indexOf("application/json") === -1) {
                    throw new Error("Unsupported patch content type: application/json is required.");
                }
                // nb: Technically you'd want to slice off the beginning "\r\n" but since
                // this is going to be `JSON.parse`d there is no need.
                const body = message.slice(i);
                if (body) {
                    yield body;
                }
                bi = buffer.indexOf(boundary);
            }
            if (passedFinalBoundary()) {
                return;
            }
        }
        throw new Error("premature end of multipart body");
    }
    finally {
        reader.cancel();
    }
}
async function readMultipartBody(response, nextValue) {
    for await (const body of consumeMultipartBody(response)) {
        const result = parseJsonEncoding(response, body);
        if (Object.keys(result).length == 0)
            continue;
        if (isApolloPayloadResult(result)) {
            if (Object.keys(result).length === 1 && result.payload === null) {
                return;
            }
            let next = { ...result.payload };
            if ("errors" in result) {
                next.extensions = {
                    ...next.extensions,
                    [errors_1.PROTOCOL_ERRORS_SYMBOL]: new errors_1.CombinedProtocolErrors(result.errors ?? []),
                };
            }
            nextValue(next);
        }
        else {
            nextValue(result);
        }
    }
}
function parseHeaders(headerText) {
    const headersInit = {};
    headerText.split("\n").forEach((line) => {
        const i = line.indexOf(":");
        if (i > -1) {
            // normalize headers to lowercase
            const name = line.slice(0, i).trim().toLowerCase();
            const value = line.slice(i + 1).trim();
            headersInit[name] = value;
        }
    });
    return headersInit;
}
function parseJsonEncoding(response, bodyText) {
    if (response.status >= 300) {
        throw new errors_1.ServerError(`Response not successful: Received status code ${response.status}`, { response, bodyText });
    }
    try {
        return JSON.parse(bodyText);
    }
    catch (err) {
        throw new errors_1.ServerParseError(err, { response, bodyText });
    }
}
function parseGraphQLResponseJsonEncoding(response, bodyText) {
    try {
        return JSON.parse(bodyText);
    }
    catch (err) {
        throw new errors_1.ServerParseError(err, { response, bodyText });
    }
}
function parseResponse(response, bodyText) {
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/graphql-response+json")) {
        return parseGraphQLResponseJsonEncoding(response, bodyText);
    }
    return parseJsonEncoding(response, bodyText);
}
function parseAndCheckHttpResponse(operations) {
    return (response) => response.text().then((bodyText) => {
        const result = parseResponse(response, bodyText);
        if (!Array.isArray(result) &&
            !hasOwnProperty.call(result, "data") &&
            !hasOwnProperty.call(result, "errors")) {
            throw new errors_1.ServerError(`Server response was malformed for query '${Array.isArray(operations) ?
                operations.map((op) => op.operationName)
                : operations.operationName}'.`, { response, bodyText });
        }
        return result;
    });
}
//# sourceMappingURL=parseAndCheckHttpResponse.cjs.map
