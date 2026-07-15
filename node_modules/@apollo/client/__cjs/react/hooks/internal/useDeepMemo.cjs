"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDeepMemo = useDeepMemo;
const tslib_1 = require("tslib");
const equality_1 = require("@wry/equality");
const React = tslib_1.__importStar(require("react"));
function useDeepMemo(memoFn, deps) {
    const ref = React.useRef(void 0);
    // eslint-disable-next-line react-hooks/refs
    if (!ref.current || !(0, equality_1.equal)(ref.current.deps, deps)) {
        ref.current = { value: memoFn(), deps };
    }
    // eslint-disable-next-line react-hooks/refs
    return ref.current.value;
}
//# sourceMappingURL=useDeepMemo.cjs.map
