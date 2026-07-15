"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.__use = void 0;
const tslib_1 = require("tslib");
const React = tslib_1.__importStar(require("react"));
const internal_1 = require("@apollo/client/utilities/internal");
// Prevent webpack from complaining about our feature detection of the
// use property of the React namespace, which is expected not
// to exist when using current stable versions, and that's fine.
const useKey = "use";
const realHook = React[useKey];
// This is named with two underscores to allow this hook to evade typical rules of
// hooks (i.e. it can be used conditionally)
exports.__use = realHook ||
    function __use(promise) {
        const decoratedPromise = (0, internal_1.decoratePromise)(promise);
        switch (decoratedPromise.status) {
            case "pending":
                throw decoratedPromise;
            case "rejected":
                throw decoratedPromise.reason;
            case "fulfilled":
                return decoratedPromise.value;
        }
    };
//# sourceMappingURL=__use.cjs.map
