import type { Trie } from "@wry/trie";
import type { Incremental } from "@apollo/client/incremental";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export type StreamInfoTrie = Trie<{
    current: Incremental.StreamFieldInfo;
    previous?: {
        incoming: unknown;
        streamFieldInfo: Incremental.StreamFieldInfo;
        result: unknown;
    };
}>;
//# sourceMappingURL=StreamInfoTrie.d.cts.map
