import { EMPTY, filter, fromEvent } from "rxjs";
import { canUseDOM } from "@apollo/client/utilities/internal";
export const windowFocusSource = () => {
    if (!canUseDOM) {
        return EMPTY;
    }
    return fromEvent(window, "visibilitychange").pipe(filter(() => document.visibilityState === "visible"));
};
//# sourceMappingURL=windowFocusSource.js.map