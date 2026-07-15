import type { FragmentDefinitionNode, InlineFragmentNode, SelectionNode } from "graphql";
import type { FragmentMap } from "./types/FragmentMap.js";
import type { FragmentMapFunction } from "./types/FragmentMapFunction.js";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare function getFragmentFromSelection(selection: SelectionNode, fragmentMap?: FragmentMap | FragmentMapFunction): InlineFragmentNode | FragmentDefinitionNode | null;
//# sourceMappingURL=getFragmentFromSelection.d.ts.map
