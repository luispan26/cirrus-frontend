import { WeakCache } from "@wry/caches";
import { visit } from "graphql";
import { wrap } from "optimism";
import { cacheSizes } from "@apollo/client/utilities";
import { bindCacheKey, getFragmentDefinitions, } from "@apollo/client/utilities/internal";
// As long as createFragmentRegistry is not imported or used, the
// FragmentRegistry example implementation provided below should not be bundled
// (by tree-shaking bundlers like Rollup), because the implementation of
// InMemoryCache refers only to the TypeScript interface FragmentRegistryAPI,
// never the concrete implementation FragmentRegistry (which is deliberately not
// exported from this module).
export function createFragmentRegistry(...fragments) {
    return new FragmentRegistry(...fragments);
}
class FragmentRegistry {
    registry = {};
    // Call `createFragmentRegistry` instead of invoking the
    // FragmentRegistry constructor directly. This reserves the constructor for
    // future configuration of the FragmentRegistry.
    constructor(...fragments) {
        this.resetCaches();
        if (fragments.length) {
            this.register(...fragments);
        }
    }
    register(...fragments) {
        const definitions = new Map();
        fragments.forEach((doc) => {
            getFragmentDefinitions(doc).forEach((node) => {
                definitions.set(node.name.value, node);
            });
        });
        definitions.forEach((node, name) => {
            if (node !== this.registry[name]) {
                this.registry[name] = node;
                this.invalidate(name);
            }
        });
        return this;
    }
    // Overridden in the resetCaches method below.
    invalidate(name) { }
    resetCaches() {
        const proto = FragmentRegistry.prototype;
        this.invalidate = (this.lookup = wrap(proto.lookup.bind(this), {
            // This is intentionally an identity function - a string cannot be keyed weakly.
            // This is not a memory leak, as lifetime is bound to the `FragmentRegistry` instance,
            // and max size is configurable.
            makeCacheKey: (arg) => arg,
            max: cacheSizes["fragmentRegistry.lookup"] ||
                1000 /* defaultCacheSizes["fragmentRegistry.lookup"] */,
        })).dirty; // This dirty function is bound to the wrapped lookup method.
        this.transform = wrap(proto.transform.bind(this), {
            makeCacheKey: bindCacheKey(this),
            cache: WeakCache,
            max: cacheSizes["fragmentRegistry.transform"] ||
                2000 /* defaultCacheSizes["fragmentRegistry.transform"] */,
        });
        this.findFragmentSpreads = wrap(proto.findFragmentSpreads.bind(this), {
            makeCacheKey: bindCacheKey(this),
            cache: WeakCache,
            max: cacheSizes["fragmentRegistry.findFragmentSpreads"] ||
                4000 /* defaultCacheSizes["fragmentRegistry.findFragmentSpreads"] */,
        });
    }
    /*
     * Note:
     * This method is only memoized so it can serve as a dependency to `transform`,
     * so calling `invalidate` will invalidate cache entries for `transform`.
     */
    lookup(fragmentName) {
        return this.registry[fragmentName] || null;
    }
    transform(document) {
        const defined = new Map();
        getFragmentDefinitions(document).forEach((def) => {
            defined.set(def.name.value, def);
        });
        const unbound = new Set();
        const enqueue = (spreadName) => {
            if (!defined.has(spreadName)) {
                unbound.add(spreadName);
            }
        };
        const enqueueChildSpreads = (node) => Object.keys(this.findFragmentSpreads(node)).forEach(enqueue);
        enqueueChildSpreads(document);
        const missing = [];
        const map = {};
        // This Set forEach loop can be extended during iteration by adding
        // additional strings to the unbound set.
        unbound.forEach((fragmentName) => {
            const knownFragmentDef = defined.get(fragmentName);
            if (knownFragmentDef) {
                enqueueChildSpreads((map[fragmentName] = knownFragmentDef));
            }
            else {
                missing.push(fragmentName);
                const def = this.lookup(fragmentName);
                if (def) {
                    enqueueChildSpreads((map[fragmentName] = def));
                }
            }
        });
        if (missing.length) {
            const defsToAppend = [];
            missing.forEach((name) => {
                const def = map[name];
                if (def) {
                    defsToAppend.push(def);
                }
            });
            if (defsToAppend.length) {
                document = {
                    ...document,
                    definitions: document.definitions.concat(defsToAppend),
                };
            }
        }
        return document;
    }
    findFragmentSpreads(root) {
        const spreads = {};
        visit(root, {
            FragmentSpread(node) {
                spreads[node.name.value] = node;
            },
        });
        return spreads;
    }
}
//# sourceMappingURL=fragmentRegistry.js.map