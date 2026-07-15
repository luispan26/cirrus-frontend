export class MissingFieldError extends Error {
    message;
    path;
    query;
    variables;
    constructor(message, path, query, variables) {
        // 'Error' breaks prototype chain here
        super(message);
        this.message = message;
        this.path = path;
        this.query = query;
        this.variables = variables;
        this.name = "MissingFieldError";
        if (Array.isArray(this.path)) {
            this.missing = this.message;
            for (let i = this.path.length - 1; i >= 0; --i) {
                this.missing = { [this.path[i]]: this.missing };
            }
        }
        else {
            this.missing = this.path;
        }
        // We're not using `Object.setPrototypeOf` here as it isn't fully supported
        // on Android (see issue #3236).
        this.__proto__ = MissingFieldError.prototype;
    }
    missing;
}
//# sourceMappingURL=common.js.map