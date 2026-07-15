"use strict";
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in this directory.
 */
/* eslint-disable */
Object.defineProperty(exports, "__esModule", { value: true });
exports.c = void 0;
const tslib_1 = require("tslib");
const React = tslib_1.__importStar(require("react"));
const $empty = Symbol.for("react.memo_cache_sentinel");
// Re-export React.c if present, otherwise fallback to the userspace polyfill for versions of React
// < 19.
exports.c = ("__COMPILER_RUNTIME" in React &&
    typeof Object(React).__COMPILER_RUNTIME?.c === "function") ?
    Object(React).__COMPILER_RUNTIME.c
    : function c(size) {
        return React.useMemo(() => {
            const $ = new Array(size);
            for (let ii = 0; ii < size; ii++) {
                $[ii] = $empty;
            }
            // This symbol is added to tell the react devtools that this array is from
            // useMemoCache.
            // @ts-ignore
            $[$empty] = true;
            return $;
        }, []);
    };
//# sourceMappingURL=index.cjs.map
