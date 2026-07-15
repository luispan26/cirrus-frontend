"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useIsomorphicLayoutEffect = void 0;
const tslib_1 = require("tslib");
const React = tslib_1.__importStar(require("react"));
const internal_1 = require("@apollo/client/utilities/internal");
// use canUseDOM here instead of canUseLayoutEffect because we want to be able
// to use useLayoutEffect in our jest tests. useLayoutEffect seems to work fine
// in useSuspenseQuery tests, but to honor the original comment about the
// warnings for useSyncExternalStore implementation, canUseLayoutEffect is left
// alone.
exports.useIsomorphicLayoutEffect = internal_1.canUseDOM ? React.useLayoutEffect : React.useEffect;
//# sourceMappingURL=useIsomorphicLayoutEffect.cjs.map
