import type { streamInfoSymbol } from "../constants.cjs";
import type { StreamInfoTrie } from "./StreamInfoTrie.cjs";
/**
 * For use in Cache implementations only.
 * This should not be used in userland code.
 */
export interface ExtensionsWithStreamInfo extends Record<string, unknown> {
    [streamInfoSymbol]?: {
        deref(): StreamInfoTrie | undefined;
    };
}
//# sourceMappingURL=ExtensionsWithStreamDetails.d.cts.map
