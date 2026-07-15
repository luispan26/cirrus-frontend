"use strict";;
const {
    __DEV__
} = require("@apollo/client/utilities/environment");

Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityStore = void 0;
exports.maybeDependOnExistenceOfEntity = maybeDependOnExistenceOfEntity;
exports.supportsResultCaching = supportsResultCaching;
const equality_1 = require("@wry/equality");
const trie_1 = require("@wry/trie");
const optimism_1 = require("optimism");
const utilities_1 = require("@apollo/client/utilities");
const environment_1 = require("@apollo/client/utilities/environment");
const internal_1 = require("@apollo/client/utilities/internal");
const invariant_1 = require("@apollo/client/utilities/invariant");
const helpers_js_1 = require("./helpers.cjs");
const DELETE = {};
const delModifier = () => DELETE;
const INVALIDATE = {};
class EntityStore {
    policies;
    group;
    data = {};
    constructor(policies, group) {
        this.policies = policies;
        this.group = group;
    }
    // Although the EntityStore class is abstract, it contains concrete
    // implementations of the various NormalizedCache interface methods that
    // are inherited by the Root and Layer subclasses.
    toObject() {
        return { ...this.data };
    }
    has(dataId) {
        return this.lookup(dataId, true) !== void 0;
    }
    get(dataId, fieldName) {
        this.group.depend(dataId, fieldName);
        if (helpers_js_1.hasOwn.call(this.data, dataId)) {
            const storeObject = this.data[dataId];
            if (storeObject && helpers_js_1.hasOwn.call(storeObject, fieldName)) {
                return storeObject[fieldName];
            }
        }
        if (fieldName === "__typename" &&
            helpers_js_1.hasOwn.call(this.policies.rootTypenamesById, dataId)) {
            return this.policies.rootTypenamesById[dataId];
        }
        if (this instanceof Layer) {
            return this.parent.get(dataId, fieldName);
        }
    }
    lookup(dataId, dependOnExistence) {
        // The has method (above) calls lookup with dependOnExistence = true, so
        // that it can later be invalidated when we add or remove a StoreObject for
        // this dataId. Any consumer who cares about the contents of the StoreObject
        // should not rely on this dependency, since the contents could change
        // without the object being added or removed.
        if (dependOnExistence)
            this.group.depend(dataId, "__exists");
        if (helpers_js_1.hasOwn.call(this.data, dataId)) {
            return this.data[dataId];
        }
        if (this instanceof Layer) {
            return this.parent.lookup(dataId, dependOnExistence);
        }
        if (this.policies.rootTypenamesById[dataId]) {
            return {};
        }
    }
    merge(older, newer) {
        let dataId;
        // Convert unexpected references to ID strings.
        if ((0, utilities_1.isReference)(older))
            older = older.__ref;
        if ((0, utilities_1.isReference)(newer))
            newer = newer.__ref;
        const existing = typeof older === "string" ? this.lookup((dataId = older)) : older;
        const incoming = typeof newer === "string" ? this.lookup((dataId = newer)) : newer;
        // If newer was a string ID, but that ID was not defined in this store,
        // then there are no fields to be merged, so we're done.
        if (!incoming)
            return;
        (0, invariant_1.invariant)(typeof dataId === "string", 104);
        const merged = new internal_1.DeepMerger({
            reconciler: storeObjectReconciler,
        }).merge(existing, incoming);
        // Even if merged === existing, existing may have come from a lower
        // layer, so we always need to set this.data[dataId] on this level.
        this.data[dataId] = merged;
        if (merged !== existing) {
            delete this.refs[dataId];
            if (this.group.caching) {
                const fieldsToDirty = {};
                // If we added a new StoreObject where there was previously none, dirty
                // anything that depended on the existence of this dataId, such as the
                // EntityStore#has method.
                if (!existing)
                    fieldsToDirty.__exists = 1;
                // Now invalidate dependents who called getFieldValue for any fields
                // that are changing as a result of this merge.
                Object.keys(incoming).forEach((storeFieldName) => {
                    if (!existing ||
                        existing[storeFieldName] !== merged[storeFieldName]) {
                        // Always dirty the full storeFieldName, which may include
                        // serialized arguments following the fieldName prefix.
                        fieldsToDirty[storeFieldName] = 1;
                        // Also dirty fieldNameFromStoreName(storeFieldName) if it's
                        // different from storeFieldName and this field does not have
                        // keyArgs configured, because that means the cache can't make
                        // any assumptions about how field values with the same field
                        // name but different arguments might be interrelated, so it
                        // must err on the side of invalidating all field values that
                        // share the same short fieldName, regardless of arguments.
                        const fieldName = (0, helpers_js_1.fieldNameFromStoreName)(storeFieldName);
                        if (fieldName !== storeFieldName &&
                            !this.policies.hasKeyArgs(merged.__typename, fieldName)) {
                            fieldsToDirty[fieldName] = 1;
                        }
                        // If merged[storeFieldName] has become undefined, and this is the
                        // Root layer, actually delete the property from the merged object,
                        // which is guaranteed to have been created fresh in this method.
                        if (merged[storeFieldName] === void 0 && !(this instanceof Layer)) {
                            delete merged[storeFieldName];
                        }
                    }
                });
                if (fieldsToDirty.__typename &&
                    !(existing && existing.__typename) &&
                    // Since we return default root __typename strings
                    // automatically from store.get, we don't need to dirty the
                    // ROOT_QUERY.__typename field if merged.__typename is equal
                    // to the default string (usually "Query").
                    this.policies.rootTypenamesById[dataId] === merged.__typename) {
                    delete fieldsToDirty.__typename;
                }
                Object.keys(fieldsToDirty).forEach((fieldName) => this.group.dirty(dataId, fieldName));
            }
        }
    }
    modify(dataId, fields, exact) {
        const storeObject = this.lookup(dataId);
        if (storeObject) {
            const changedFields = {};
            let needToMerge = false;
            let allDeleted = true;
            const sharedDetails = {
                DELETE,
                INVALIDATE,
                isReference: utilities_1.isReference,
                toReference: this.toReference,
                canRead: this.canRead,
                readField: (fieldNameOrOptions, from) => this.policies.readField(typeof fieldNameOrOptions === "string" ?
                    {
                        fieldName: fieldNameOrOptions,
                        from: from || (0, internal_1.makeReference)(dataId),
                    }
                    : fieldNameOrOptions, { store: this }),
            };
            Object.keys(storeObject).forEach((storeFieldName) => {
                const fieldName = (0, helpers_js_1.fieldNameFromStoreName)(storeFieldName);
                let fieldValue = storeObject[storeFieldName];
                if (fieldValue === void 0)
                    return;
                const modify = typeof fields === "function" ? fields : (fields[storeFieldName] || (exact ? undefined : fields[fieldName]));
                if (modify) {
                    let newValue = modify === delModifier ? DELETE : (modify((0, internal_1.maybeDeepFreeze)(fieldValue), {
                        ...sharedDetails,
                        fieldName,
                        storeFieldName,
                        storage: this.getStorage(dataId, storeFieldName),
                    }));
                    if (newValue === INVALIDATE) {
                        this.group.dirty(dataId, storeFieldName);
                    }
                    else {
                        if (newValue === DELETE)
                            newValue = void 0;
                        if (newValue !== fieldValue) {
                            changedFields[storeFieldName] = newValue;
                            needToMerge = true;
                            fieldValue = newValue;
                            if (environment_1.__DEV__) {
                                const checkReference = (ref) => {
                                    if (this.lookup(ref.__ref) === undefined) {
                                        __DEV__ && invariant_1.invariant.warn(105, ref);
                                        return true;
                                    }
                                };
                                if ((0, utilities_1.isReference)(newValue)) {
                                    checkReference(newValue);
                                }
                                else if (Array.isArray(newValue)) {
                                    // Warn about writing "mixed" arrays of Reference and non-Reference objects
                                    let seenReference = false;
                                    let someNonReference;
                                    for (const value of newValue) {
                                        if ((0, utilities_1.isReference)(value)) {
                                            seenReference = true;
                                            if (checkReference(value))
                                                break;
                                        }
                                        else {
                                            // Do not warn on primitive values, since those could never be represented
                                            // by a reference. This is a valid (albeit uncommon) use case.
                                            if (typeof value === "object" && !!value) {
                                                const [id] = this.policies.identify(value);
                                                // check if object could even be referenced, otherwise we are not interested in it for this warning
                                                if (id) {
                                                    someNonReference = value;
                                                }
                                            }
                                        }
                                        if (seenReference && someNonReference !== undefined) {
                                            __DEV__ && invariant_1.invariant.warn(106, someNonReference);
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                if (fieldValue !== void 0) {
                    allDeleted = false;
                }
            });
            if (needToMerge) {
                this.merge(dataId, changedFields);
                if (allDeleted) {
                    if (this instanceof Layer) {
                        this.data[dataId] = void 0;
                    }
                    else {
                        delete this.data[dataId];
                    }
                    this.group.dirty(dataId, "__exists");
                }
                return true;
            }
        }
        return false;
    }
    // If called with only one argument, removes the entire entity
    // identified by dataId. If called with a fieldName as well, removes all
    // fields of that entity whose names match fieldName according to the
    // fieldNameFromStoreName helper function. If called with a fieldName
    // and variables, removes all fields of that entity whose names match fieldName
    // and whose arguments when cached exactly match the variables passed.
    delete(dataId, fieldName, args) {
        const storeObject = this.lookup(dataId);
        if (storeObject) {
            const typename = this.getFieldValue(storeObject, "__typename");
            const storeFieldName = fieldName && args ?
                this.policies.getStoreFieldName({ typename, fieldName, args })
                : fieldName;
            return this.modify(dataId, storeFieldName ?
                {
                    [storeFieldName]: delModifier,
                }
                : delModifier, !!args);
        }
        return false;
    }
    evict(options, limit) {
        let evicted = false;
        if (options.id) {
            if (helpers_js_1.hasOwn.call(this.data, options.id)) {
                evicted = this.delete(options.id, options.fieldName, options.args);
            }
            if (this instanceof Layer && this !== limit) {
                evicted = this.parent.evict(options, limit) || evicted;
            }
            // Always invalidate the field to trigger rereading of watched
            // queries, even if no cache data was modified by the eviction,
            // because queries may depend on computed fields with custom read
            // functions, whose values are not stored in the EntityStore.
            if (options.fieldName || evicted) {
                this.group.dirty(options.id, options.fieldName || "__exists");
            }
        }
        return evicted;
    }
    clear() {
        this.replace(null);
    }
    extract() {
        const obj = this.toObject();
        const extraRootIds = [];
        this.getRootIdSet().forEach((id) => {
            if (!helpers_js_1.hasOwn.call(this.policies.rootTypenamesById, id)) {
                extraRootIds.push(id);
            }
        });
        if (extraRootIds.length) {
            obj.__META = { extraRootIds: extraRootIds.sort() };
        }
        return obj;
    }
    replace(newData) {
        Object.keys(this.data).forEach((dataId) => {
            if (!(newData && helpers_js_1.hasOwn.call(newData, dataId))) {
                this.delete(dataId);
            }
        });
        if (newData) {
            const { __META, ...rest } = newData;
            Object.keys(rest).forEach((dataId) => {
                this.merge(dataId, rest[dataId]);
            });
            if (__META) {
                __META.extraRootIds.forEach(this.retain, this);
            }
        }
    }
    // Maps root entity IDs to the number of times they have been retained, minus
    // the number of times they have been released. Retained entities keep other
    // entities they reference (even indirectly) from being garbage collected.
    rootIds = {};
    retain(rootId) {
        return (this.rootIds[rootId] = (this.rootIds[rootId] || 0) + 1);
    }
    release(rootId) {
        if (this.rootIds[rootId] > 0) {
            const count = --this.rootIds[rootId];
            if (!count)
                delete this.rootIds[rootId];
            return count;
        }
        return 0;
    }
    // Return a Set<string> of all the ID strings that have been retained by
    // this layer/root *and* any layers/roots beneath it.
    getRootIdSet(ids = new Set()) {
        Object.keys(this.rootIds).forEach(ids.add, ids);
        if (this instanceof Layer) {
            this.parent.getRootIdSet(ids);
        }
        else {
            // Official singleton IDs like ROOT_QUERY and ROOT_MUTATION are
            // always considered roots for garbage collection, regardless of
            // their retainment counts in this.rootIds.
            Object.keys(this.policies.rootTypenamesById).forEach(ids.add, ids);
        }
        return ids;
    }
    // The goal of garbage collection is to remove IDs from the Root layer of the
    // store that are no longer reachable starting from any IDs that have been
    // explicitly retained (see retain and release, above). Returns an array of
    // dataId strings that were removed from the store.
    gc() {
        const ids = this.getRootIdSet();
        const snapshot = this.toObject();
        ids.forEach((id) => {
            if (helpers_js_1.hasOwn.call(snapshot, id)) {
                // Because we are iterating over an ECMAScript Set, the IDs we add here
                // will be visited in later iterations of the forEach loop only if they
                // were not previously contained by the Set.
                Object.keys(this.findChildRefIds(id)).forEach(ids.add, ids);
                // By removing IDs from the snapshot object here, we protect them from
                // getting removed from the root store layer below.
                delete snapshot[id];
            }
        });
        const idsToRemove = Object.keys(snapshot);
        if (idsToRemove.length) {
            let root = this;
            while (root instanceof Layer)
                root = root.parent;
            idsToRemove.forEach((id) => root.delete(id));
        }
        return idsToRemove;
    }
    // Lazily tracks { __ref: <dataId> } strings contained by this.data[dataId].
    refs = {};
    findChildRefIds(dataId) {
        if (!helpers_js_1.hasOwn.call(this.refs, dataId)) {
            const found = (this.refs[dataId] = {});
            const root = this.data[dataId];
            if (!root)
                return found;
            const workSet = new Set([root]);
            // Within the store, only arrays and objects can contain child entity
            // references, so we can prune the traversal using this predicate:
            workSet.forEach((obj) => {
                if ((0, utilities_1.isReference)(obj)) {
                    found[obj.__ref] = true;
                    // In rare cases, a { __ref } Reference object may have other fields.
                    // This often indicates a mismerging of References with StoreObjects,
                    // but garbage collection should not be fooled by a stray __ref
                    // property in a StoreObject (ignoring all the other fields just
                    // because the StoreObject looks like a Reference). To avoid this
                    // premature termination of findChildRefIds recursion, we fall through
                    // to the code below, which will handle any other properties of obj.
                }
                if ((0, internal_1.isNonNullObject)(obj)) {
                    Object.keys(obj).forEach((key) => {
                        const child = obj[key];
                        // No need to add primitive values to the workSet, since they cannot
                        // contain reference objects.
                        if ((0, internal_1.isNonNullObject)(child)) {
                            workSet.add(child);
                        }
                    });
                }
            });
        }
        return this.refs[dataId];
    }
    makeCacheKey() {
        return this.group.keyMaker.lookupArray(arguments);
    }
    // Bound function that can be passed around to provide easy access to fields
    // of Reference objects as well as ordinary objects.
    getFieldValue = (objectOrReference, storeFieldName) => (0, internal_1.maybeDeepFreeze)((0, utilities_1.isReference)(objectOrReference) ?
        this.get(objectOrReference.__ref, storeFieldName)
        : objectOrReference && objectOrReference[storeFieldName]);
    // Returns true for non-normalized StoreObjects and non-dangling
    // References, indicating that readField(name, objOrRef) has a chance of
    // working. Useful for filtering out dangling references from lists.
    canRead = (objOrRef) => {
        return (0, utilities_1.isReference)(objOrRef) ?
            this.has(objOrRef.__ref)
            : typeof objOrRef === "object";
    };
    // Bound function that converts an id or an object with a __typename and
    // primary key fields to a Reference object. If called with a Reference object,
    // that same Reference object is returned. Pass true for mergeIntoStore to persist
    // an object into the store.
    toReference = (objOrIdOrRef, mergeIntoStore) => {
        if (typeof objOrIdOrRef === "string") {
            return (0, internal_1.makeReference)(objOrIdOrRef);
        }
        if ((0, utilities_1.isReference)(objOrIdOrRef)) {
            return objOrIdOrRef;
        }
        const [id] = this.policies.identify(objOrIdOrRef);
        if (id) {
            const ref = (0, internal_1.makeReference)(id);
            if (mergeIntoStore) {
                this.merge(id, objOrIdOrRef);
            }
            return ref;
        }
    };
    get supportsResultCaching() {
        return this.group.caching;
    }
}
exports.EntityStore = EntityStore;
// A single CacheGroup represents a set of one or more EntityStore objects,
// typically the Root store in a CacheGroup by itself, and all active Layer
// stores in a group together. A single EntityStore object belongs to only
// one CacheGroup, store.group. The CacheGroup is responsible for tracking
// dependencies, so store.group is helpful for generating unique keys for
// cached results that need to be invalidated when/if those dependencies
// change. If we used the EntityStore objects themselves as cache keys (that
// is, store rather than store.group), the cache would become unnecessarily
// fragmented by all the different Layer objects. Instead, the CacheGroup
// approach allows all optimistic Layer objects in the same linked list to
// belong to one CacheGroup, with the non-optimistic Root object belonging
// to another CacheGroup, allowing resultCaching dependencies to be tracked
// separately for optimistic and non-optimistic entity data.
class CacheGroup {
    caching;
    parent;
    d = null;
    // Used by the EntityStore#makeCacheKey method to compute cache keys
    // specific to this CacheGroup.
    keyMaker;
    constructor(caching, parent = null) {
        this.caching = caching;
        this.parent = parent;
        this.resetCaching();
    }
    resetCaching() {
        this.d = this.caching ? (0, optimism_1.dep)() : null;
        this.keyMaker = new trie_1.Trie();
    }
    depend(dataId, storeFieldName) {
        if (this.d) {
            this.d(makeDepKey(dataId, storeFieldName));
            const fieldName = (0, helpers_js_1.fieldNameFromStoreName)(storeFieldName);
            if (fieldName !== storeFieldName) {
                // Fields with arguments that contribute extra identifying
                // information to the fieldName (thus forming the storeFieldName)
                // depend not only on the full storeFieldName but also on the
                // short fieldName, so the field can be invalidated using either
                // level of specificity.
                this.d(makeDepKey(dataId, fieldName));
            }
            if (this.parent) {
                this.parent.depend(dataId, storeFieldName);
            }
        }
    }
    dirty(dataId, storeFieldName) {
        if (this.d) {
            this.d.dirty(makeDepKey(dataId, storeFieldName), 
            // When storeFieldName === "__exists", that means the entity identified
            // by dataId has either disappeared from the cache or was newly added,
            // so the result caching system would do well to "forget everything it
            // knows" about that object. To achieve that kind of invalidation, we
            // not only dirty the associated result cache entry, but also remove it
            // completely from the dependency graph. For the optimism implementation
            // details, see https://github.com/benjamn/optimism/pull/195.
            storeFieldName === "__exists" ? "forget" : "setDirty");
        }
    }
}
function makeDepKey(dataId, storeFieldName) {
    // Since field names cannot have '#' characters in them, this method
    // of joining the field name and the ID should be unambiguous, and much
    // cheaper than JSON.stringify([dataId, fieldName]).
    return storeFieldName + "#" + dataId;
}
function maybeDependOnExistenceOfEntity(store, entityId) {
    if (supportsResultCaching(store)) {
        // We use this pseudo-field __exists elsewhere in the EntityStore code to
        // represent changes in the existence of the entity object identified by
        // entityId. This dependency gets reliably dirtied whenever an object with
        // this ID is deleted (or newly created) within this group, so any result
        // cache entries (for example, StoreReader#executeSelectionSet results) that
        // depend on __exists for this entityId will get dirtied as well, leading to
        // the eventual recomputation (instead of reuse) of those result objects the
        // next time someone reads them from the cache.
        store.group.depend(entityId, "__exists");
    }
}
class Root extends EntityStore {
    constructor({ policies, resultCaching = true, seed, }) {
        super(policies, new CacheGroup(resultCaching));
        if (seed)
            this.replace(seed);
    }
    stump = new Stump(this);
    addLayer(layerId, replay) {
        // Adding an optimistic Layer on top of the Root actually adds the Layer
        // on top of the Stump, so the Stump always comes between the Root and
        // any Layer objects that we've added.
        return this.stump.addLayer(layerId, replay);
    }
    removeLayer() {
        // Never remove the root layer.
        return this;
    }
    storageTrie = new trie_1.Trie();
    getStorage() {
        return this.storageTrie.lookupArray(arguments);
    }
}
EntityStore.Root = Root;
// Not exported, since all Layer instances are created by the addLayer method
// of the EntityStore.Root class.
class Layer extends EntityStore {
    id;
    parent;
    replay;
    group;
    constructor(id, parent, replay, group) {
        super(parent.policies, group);
        this.id = id;
        this.parent = parent;
        this.replay = replay;
        this.group = group;
        replay(this);
    }
    addLayer(layerId, replay) {
        return new Layer(layerId, this, replay, this.group);
    }
    removeLayer(layerId) {
        // Remove all instances of the given id, not just the first one.
        const parent = this.parent.removeLayer(layerId);
        if (layerId === this.id) {
            if (this.group.caching) {
                // Dirty every ID we're removing. Technically we might be able to avoid
                // dirtying fields that have values in higher layers, but we don't have
                // easy access to higher layers here, and we're about to recreate those
                // layers anyway (see parent.addLayer below).
                Object.keys(this.data).forEach((dataId) => {
                    const ownStoreObject = this.data[dataId];
                    const parentStoreObject = parent["lookup"](dataId);
                    if (!parentStoreObject) {
                        // The StoreObject identified by dataId was defined in this layer
                        // but will be undefined in the parent layer, so we can delete the
                        // whole entity using this.delete(dataId). Since we're about to
                        // throw this layer away, the only goal of this deletion is to dirty
                        // the removed fields.
                        this.delete(dataId);
                    }
                    else if (!ownStoreObject) {
                        // This layer had an entry for dataId but it was undefined, which
                        // means the entity was deleted in this layer, and it's about to
                        // become undeleted when we remove this layer, so we need to dirty
                        // all fields that are about to be reexposed.
                        this.group.dirty(dataId, "__exists");
                        Object.keys(parentStoreObject).forEach((storeFieldName) => {
                            this.group.dirty(dataId, storeFieldName);
                        });
                    }
                    else if (ownStoreObject !== parentStoreObject) {
                        // If ownStoreObject is not exactly the same as parentStoreObject,
                        // dirty any fields whose values will change as a result of this
                        // removal.
                        Object.keys(ownStoreObject).forEach((storeFieldName) => {
                            if (!(0, equality_1.equal)(ownStoreObject[storeFieldName], parentStoreObject[storeFieldName])) {
                                this.group.dirty(dataId, storeFieldName);
                            }
                        });
                    }
                });
            }
            return parent;
        }
        // No changes are necessary if the parent chain remains identical.
        if (parent === this.parent)
            return this;
        // Recreate this layer on top of the new parent.
        return parent.addLayer(this.id, this.replay);
    }
    toObject() {
        return {
            ...this.parent.toObject(),
            ...this.data,
        };
    }
    findChildRefIds(dataId) {
        const fromParent = this.parent.findChildRefIds(dataId);
        return helpers_js_1.hasOwn.call(this.data, dataId) ?
            {
                ...fromParent,
                ...super.findChildRefIds(dataId),
            }
            : fromParent;
    }
    getStorage(...args) {
        let p = this.parent;
        while (p.parent)
            p = p.parent;
        return p.getStorage(...args);
    }
}
// Represents a Layer permanently installed just above the Root, which allows
// reading optimistically (and registering optimistic dependencies) even when
// no optimistic layers are currently active. The stump.group CacheGroup object
// is shared by any/all Layer objects added on top of the Stump.
class Stump extends Layer {
    constructor(root) {
        super("EntityStore.Stump", root, () => { }, new CacheGroup(root.group.caching, root.group));
    }
    removeLayer() {
        // Never remove the Stump layer.
        return this;
    }
    merge(older, newer) {
        // We never want to write any data into the Stump, so we forward any merge
        // calls to the Root instead. Another option here would be to throw an
        // exception, but the toReference(object, true) function can sometimes
        // trigger Stump writes (which used to be Root writes, before the Stump
        // concept was introduced).
        return this.parent.merge(older, newer);
    }
}
function storeObjectReconciler(existingObject, incomingObject, property) {
    const existingValue = existingObject[property];
    const incomingValue = incomingObject[property];
    // Wherever there is a key collision, prefer the incoming value, unless
    // it is deeply equal to the existing value. It's worth checking deep
    // equality here (even though blindly returning incoming would be
    // logically correct) because preserving the referential identity of
    // existing data can prevent needless rereading and rerendering.
    return (0, equality_1.equal)(existingValue, incomingValue) ? existingValue : incomingValue;
}
function supportsResultCaching(store) {
    // When result caching is disabled, store.depend will be null.
    return !!(store && store.supportsResultCaching);
}
//# sourceMappingURL=entityStore.cjs.map
