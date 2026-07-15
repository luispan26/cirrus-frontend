type Directives = {
    [directiveName: string]: {
        [argName: string]: any;
    };
};
declare let storeKeyNameStringify: (value: any) => string;
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare const getStoreKeyName: ((fieldName: string, args?: Record<string, any> | null, directives?: Directives) => string) & {
    setStringify(s: typeof storeKeyNameStringify): (value: any) => string;
};
export {};
//# sourceMappingURL=getStoreKeyName.d.ts.map
