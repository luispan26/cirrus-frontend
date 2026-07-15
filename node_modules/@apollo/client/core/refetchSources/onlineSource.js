import { EMPTY, fromEvent } from "rxjs";
import { canUseDOM } from "@apollo/client/utilities/internal";
export const onlineSource = () => {
    return canUseDOM ? fromEvent(window, "online") : EMPTY;
};
//# sourceMappingURL=onlineSource.js.map