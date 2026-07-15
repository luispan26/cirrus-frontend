"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeOrFieldNameRegExp = exports.hasOwn = void 0;
exports.defaultDataIdFromObject = defaultDataIdFromObject;
exports.normalizeConfig = normalizeConfig;
exports.getTypenameFromStoreObject = getTypenameFromStoreObject;
exports.fieldNameFromStoreName = fieldNameFromStoreName;
exports.selectionSetMatchesResult = selectionSetMatchesResult;
exports.storeValueIsStoreObject = storeValueIsStoreObject;
exports.makeProcessedFieldsMerger = makeProcessedFieldsMerger;
exports.extractFragmentContext = extractFragmentContext;
const utilities_1 = require("@apollo/client/utilities");
const internal_1 = require("@apollo/client/utilities/internal");
exports.hasOwn = Object.prototype.hasOwnProperty;
function defaultDataIdFromObject({ __typename, id, _id }, context) {
    if (typeof __typename === "string") {
        if (context) {
            context.keyObject =
                id != null ? { id }
                    : _id != null ? { _id }
                        : void 0;
        }
        // If there is no object.id, fall back to object._id.
        if (id == null && _id != null) {
            id = _id;
        }
        if (id != null) {
            return `${__typename}:${typeof id === "number" || typeof id === "string" ?
                id
                : JSON.stringify(id)}`;
        }
    }
}
const defaultConfig = {
    dataIdFromObject: defaultDataIdFromObject,
    resultCaching: true,
};
function normalizeConfig(config) {
    return (0, internal_1.compact)(defaultConfig, config);
}
function getTypenameFromStoreObject(store, objectOrReference) {
    return (0, utilities_1.isReference)(objectOrReference) ?
        store.get(objectOrReference.__ref, "__typename")
        : objectOrReference && objectOrReference.__typename;
}
exports.TypeOrFieldNameRegExp = /^[_a-z][_0-9a-z]*/i;
function fieldNameFromStoreName(storeFieldName) {
    const match = storeFieldName.match(exports.TypeOrFieldNameRegExp);
    return match ? match[0] : storeFieldName;
}
function selectionSetMatchesResult(selectionSet, result, variables) {
    if ((0, internal_1.isNonNullObject)(result)) {
        return (0, internal_1.isArray)(result) ?
            result.every((item) => selectionSetMatchesResult(selectionSet, item, variables))
            : selectionSet.selections.every((field) => {
                if ((0, internal_1.isField)(field) && (0, internal_1.shouldInclude)(field, variables)) {
                    const key = (0, internal_1.resultKeyNameFromField)(field);
                    return (exports.hasOwn.call(result, key) &&
                        (!field.selectionSet ||
                            selectionSetMatchesResult(field.selectionSet, result[key], variables)));
                }
                // If the selection has been skipped with @skip(true) or
                // @include(false), it should not count against the matching. If
                // the selection is not a field, it must be a fragment (inline or
                // named). We will determine if selectionSetMatchesResult for that
                // fragment when we get to it, so for now we return true.
                return true;
            });
    }
    return false;
}
function storeValueIsStoreObject(value) {
    return (0, internal_1.isNonNullObject)(value) && !(0, utilities_1.isReference)(value) && !(0, internal_1.isArray)(value);
}
function makeProcessedFieldsMerger() {
    return new internal_1.DeepMerger();
}
function extractFragmentContext(document, fragments) {
    // FragmentMap consisting only of fragments defined directly in document, not
    // including other fragments registered in the FragmentRegistry.
    const fragmentMap = (0, internal_1.createFragmentMap)((0, internal_1.getFragmentDefinitions)(document));
    return {
        fragmentMap,
        lookupFragment(name) {
            let def = fragmentMap[name];
            if (!def && fragments) {
                def = fragments.lookup(name);
            }
            return def || null;
        },
    };
}
//# sourceMappingURL=helpers.cjs.map
