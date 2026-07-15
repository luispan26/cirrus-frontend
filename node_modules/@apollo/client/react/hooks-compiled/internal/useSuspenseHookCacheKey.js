import { c as _c } from "@apollo/client/react/internal/compiler-runtime";
import * as React from "react";
import { canonicalStringify } from "@apollo/client/utilities";
import { skipToken } from "../constants.js";
export function useSuspenseHookCacheKey(query, options) {
    const $ = _c(11);
    const {
        queryKey: t0,
        variables
    } = options;
    let t1;

    if ($[0] !== t0) {
        t1 = t0 === undefined ? [] : t0;
        $[0] = t0;
        $[1] = t1;
    } else {
        t1 = $[1];
    }

    const queryKey = t1;
    let t2;

    if ($[2] !== variables) {
        t2 = canonicalStringify(variables);
        $[2] = variables;
        $[3] = t2;
    } else {
        t2 = $[3];
    }

    const canonicalVariables = t2;
    let [cacheKeyVariables, setCacheKeyVariables] = React.useState(canonicalVariables);
    if (options !== skipToken && cacheKeyVariables !== canonicalVariables) {
        setCacheKeyVariables(cacheKeyVariables = canonicalVariables);
    }
    const t3 = cacheKeyVariables;
    let t4;

    if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
        t4 = [];
        $[4] = t4;
    } else {
        t4 = $[4];
    }

    let t5;

    if ($[5] !== queryKey) {
        t5 = t4.concat(queryKey);
        $[5] = queryKey;
        $[6] = t5;
    } else {
        t5 = $[6];
    }

    let t6;

    if ($[7] !== cacheKeyVariables || $[8] !== query || $[9] !== t5) {
        t6 = [query, t3, ...t5];
        $[7] = cacheKeyVariables;
        $[8] = query;
        $[9] = t5;
        $[10] = t6;
    } else {
        t6 = $[10];
    }

    return t6;
}
//# sourceMappingURL=useSuspenseHookCacheKey.js.map
