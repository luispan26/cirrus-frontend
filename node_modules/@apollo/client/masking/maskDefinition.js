import { Kind } from "graphql";
import { __DEV__ } from "@apollo/client/utilities/environment";
import { maybeDeepFreeze, resultKeyNameFromField, } from "@apollo/client/utilities/internal";
import { invariant } from "@apollo/client/utilities/invariant";
import { disableWarningsSlot, getFragmentMaskMode } from "./utils.js";
export function maskDefinition(data, selectionSet, context) {
    return disableWarningsSlot.withValue(true, () => {
        const masked = maskSelectionSet(data, selectionSet, context, false);
        if (Object.isFrozen(data)) {
            maybeDeepFreeze(masked);
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
            const masked = maskSelectionSet(item, selectionSet, context, migration, __DEV__ ? `${path || ""}[${index}]` : void 0);
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
        if (selection.kind === Kind.FIELD) {
            const keyName = resultKeyNameFromField(selection);
            const childSelectionSet = selection.selectionSet;
            value = memo[keyName] || data[keyName];
            if (value === void 0) {
                continue;
            }
            if (childSelectionSet && value !== null) {
                const masked = maskSelectionSet(data[keyName], childSelectionSet, context, migration, __DEV__ ? `${path || ""}.${keyName}` : void 0);
                if (knownChanged.has(masked)) {
                    value = masked;
                }
            }
            if (!__DEV__) {
                memo[keyName] = value;
            }
            if (__DEV__) {
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
        if (selection.kind === Kind.INLINE_FRAGMENT &&
            (!selection.typeCondition ||
                context.cache.fragmentMatches(selection, data.__typename))) {
            value = maskSelectionSet(data, selection.selectionSet, context, migration, path);
        }
        if (selection.kind === Kind.FRAGMENT_SPREAD) {
            const fragmentName = selection.name.value;
            const fragment = context.fragmentMap[fragmentName] ||
                (context.fragmentMap[fragmentName] =
                    context.cache.lookupFragment(fragmentName));
            invariant(fragment, 39, fragmentName);
            const mode = getFragmentMaskMode(selection);
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
        if (disableWarningsSlot.getValue()) {
            return value;
        }
        __DEV__ && invariant.warn(40, operationName ?
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
//# sourceMappingURL=maskDefinition.js.map
