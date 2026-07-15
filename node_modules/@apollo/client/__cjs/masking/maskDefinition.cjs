"use strict";;
const {
    __DEV__
} = require("@apollo/client/utilities/environment");

Object.defineProperty(exports, "__esModule", { value: true });
exports.maskDefinition = maskDefinition;
const graphql_1 = require("graphql");
const environment_1 = require("@apollo/client/utilities/environment");
const internal_1 = require("@apollo/client/utilities/internal");
const invariant_1 = require("@apollo/client/utilities/invariant");
const utils_js_1 = require("./utils.cjs");
function maskDefinition(data, selectionSet, context) {
    return utils_js_1.disableWarningsSlot.withValue(true, () => {
        const masked = maskSelectionSet(data, selectionSet, context, false);
        if (Object.isFrozen(data)) {
            (0, internal_1.maybeDeepFreeze)(masked);
        }
        return masked;
    });
}
function getMutableTarget(data, mutableTargets) {
    if (mutableTargets.has(data)) {
        return mutableTargets.get(data);
    }
    const mutableTarget = Array.isArray(data) ? [] : {};
    mutableTargets.set(data, mutableTarget);
    return mutableTarget;
}
function maskSelectionSet(data, selectionSet, context, migration, path) {
    const { knownChanged } = context;
    const memo = getMutableTarget(data, context.mutableTargets);
    if (Array.isArray(data)) {
        for (const [index, item] of Array.from(data.entries())) {
            if (item === null) {
                memo[index] = null;
                continue;
            }
            const masked = maskSelectionSet(item, selectionSet, context, migration, environment_1.__DEV__ ? `${path || ""}[${index}]` : void 0);
            if (knownChanged.has(masked)) {
                knownChanged.add(memo);
            }
            memo[index] = masked;
        }
        return knownChanged.has(memo) ? memo : data;
    }
    for (const selection of selectionSet.selections) {
        let value;
        // we later want to add accessor warnings to the final result
        // so we need a new object to add the accessor warning to
        if (migration) {
            knownChanged.add(memo);
        }
        if (selection.kind === graphql_1.Kind.FIELD) {
            const keyName = (0, internal_1.resultKeyNameFromField)(selection);
            const childSelectionSet = selection.selectionSet;
            value = memo[keyName] || data[keyName];
            if (value === void 0) {
                continue;
            }
            if (childSelectionSet && value !== null) {
                const masked = maskSelectionSet(data[keyName], childSelectionSet, context, migration, environment_1.__DEV__ ? `${path || ""}.${keyName}` : void 0);
                if (knownChanged.has(masked)) {
                    value = masked;
                }
            }
            if (!environment_1.__DEV__) {
                memo[keyName] = value;
            }
            if (environment_1.__DEV__) {
                if (migration &&
                    keyName !== "__typename" &&
                    // either the field is not present in the memo object
                    // or it has a `get` descriptor, not a `value` descriptor
                    // => it is a warning accessor and we can overwrite it
                    // with another accessor
                    !Object.getOwnPropertyDescriptor(memo, keyName)?.value) {
                    Object.defineProperty(memo, keyName, getAccessorWarningDescriptor(keyName, value, path || "", context.operationName, context.operationType));
                }
                else {
                    delete memo[keyName];
                    memo[keyName] = value;
                }
            }
        }
        if (selection.kind === graphql_1.Kind.INLINE_FRAGMENT &&
            (!selection.typeCondition ||
                context.cache.fragmentMatches(selection, data.__typename))) {
            value = maskSelectionSet(data, selection.selectionSet, context, migration, path);
        }
        if (selection.kind === graphql_1.Kind.FRAGMENT_SPREAD) {
            const fragmentName = selection.name.value;
            const fragment = context.fragmentMap[fragmentName] ||
                (context.fragmentMap[fragmentName] =
                    context.cache.lookupFragment(fragmentName));
            (0, invariant_1.invariant)(fragment, 39, fragmentName);
            const mode = (0, utils_js_1.getFragmentMaskMode)(selection);
            if (mode !== "mask") {
                value = maskSelectionSet(data, fragment.selectionSet, context, mode === "migrate", path);
            }
        }
        if (knownChanged.has(value)) {
            knownChanged.add(memo);
        }
    }
    if ("__typename" in data && !("__typename" in memo)) {
        memo.__typename = data.__typename;
    }
    // This check prevents cases where masked fields may accidentally be
    // returned as part of this object when the fragment also selects
    // additional fields from the same child selection.
    if (Object.keys(memo).length !== Object.keys(data).length) {
        knownChanged.add(memo);
    }
    return knownChanged.has(memo) ? memo : data;
}
function getAccessorWarningDescriptor(fieldName, value, path, operationName, operationType) {
    let getValue = () => {
        if (utils_js_1.disableWarningsSlot.getValue()) {
            return value;
        }
        __DEV__ && invariant_1.invariant.warn(40, operationName ?
            `${operationType} '${operationName}'`
            : `anonymous ${operationType}`, `${path}.${fieldName}`.replace(/^\./, ""));
        getValue = () => value;
        return value;
    };
    return {
        get() {
            return getValue();
        },
        set(newValue) {
            getValue = () => newValue;
        },
        enumerable: true,
        configurable: true,
    };
}
//# sourceMappingURL=maskDefinition.cjs.map
