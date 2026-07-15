"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.equalByQuery = equalByQuery;
const equality_1 = require("@wry/equality");
const createFragmentMap_js_1 = require("./createFragmentMap.cjs");
const getFragmentDefinitions_js_1 = require("./getFragmentDefinitions.cjs");
const getFragmentFromSelection_js_1 = require("./getFragmentFromSelection.cjs");
const getMainDefinition_js_1 = require("./getMainDefinition.cjs");
const isField_js_1 = require("./isField.cjs");
const resultKeyNameFromField_js_1 = require("./resultKeyNameFromField.cjs");
const shouldInclude_js_1 = require("./shouldInclude.cjs");
// Returns true if aResult and bResult are deeply equal according to the fields
// selected by the given query, ignoring any fields marked as @nonreactive.
function equalByQuery(query, { data: aData, ...aRest }, { data: bData, ...bRest }, variables) {
    return ((0, equality_1.equal)(aRest, bRest) &&
        equalBySelectionSet((0, getMainDefinition_js_1.getMainDefinition)(query).selectionSet, aData, bData, {
            fragmentMap: (0, createFragmentMap_js_1.createFragmentMap)((0, getFragmentDefinitions_js_1.getFragmentDefinitions)(query)),
            variables,
        }));
}
function equalBySelectionSet(selectionSet, aResult, bResult, context) {
    if (aResult === bResult) {
        return true;
    }
    const seenSelections = new Set();
    // Returning true from this Array.prototype.every callback function skips the
    // current field/subtree. Returning false aborts the entire traversal
    // immediately, causing equalBySelectionSet to return false.
    return selectionSet.selections.every((selection) => {
        // Avoid re-processing the same selection at the same level of recursion, in
        // case the same field gets included via multiple indirect fragment spreads.
        if (seenSelections.has(selection))
            return true;
        seenSelections.add(selection);
        // Ignore @skip(if: true) and @include(if: false) fields.
        if (!(0, shouldInclude_js_1.shouldInclude)(selection, context.variables))
            return true;
        // If the field or (named) fragment spread has a @nonreactive directive on
        // it, we don't care if it's different, so we pretend it's the same.
        if (selectionHasNonreactiveDirective(selection))
            return true;
        if ((0, isField_js_1.isField)(selection)) {
            const resultKey = (0, resultKeyNameFromField_js_1.resultKeyNameFromField)(selection);
            const aResultChild = aResult && aResult[resultKey];
            const bResultChild = bResult && bResult[resultKey];
            const childSelectionSet = selection.selectionSet;
            if (!childSelectionSet) {
                // These are scalar values, so we can compare them with deep equal
                // without redoing the main recursive work.
                return (0, equality_1.equal)(aResultChild, bResultChild);
            }
            const aChildIsArray = Array.isArray(aResultChild);
            const bChildIsArray = Array.isArray(bResultChild);
            if (aChildIsArray !== bChildIsArray)
                return false;
            if (aChildIsArray && bChildIsArray) {
                const length = aResultChild.length;
                if (bResultChild.length !== length) {
                    return false;
                }
                for (let i = 0; i < length; ++i) {
                    if (!equalBySelectionSet(childSelectionSet, aResultChild[i], bResultChild[i], context)) {
                        return false;
                    }
                }
                return true;
            }
            return equalBySelectionSet(childSelectionSet, aResultChild, bResultChild, context);
        }
        else {
            const fragment = (0, getFragmentFromSelection_js_1.getFragmentFromSelection)(selection, context.fragmentMap);
            if (fragment) {
                // The fragment might === selection if it's an inline fragment, but
                // could be !== if it's a named fragment ...spread.
                if (selectionHasNonreactiveDirective(fragment))
                    return true;
                return equalBySelectionSet(fragment.selectionSet, 
                // Notice that we reuse the same aResult and bResult values here,
                // since the fragment ...spread does not specify a field name, but
                // consists of multiple fields (within the fragment's selection set)
                // that should be applied to the current result value(s).
                aResult, bResult, context);
            }
        }
    });
}
function selectionHasNonreactiveDirective(selection) {
    return (!!selection.directives && selection.directives.some(directiveIsNonreactive));
}
function directiveIsNonreactive(dir) {
    return dir.name.value === "nonreactive";
}
//# sourceMappingURL=equalByQuery.cjs.map
