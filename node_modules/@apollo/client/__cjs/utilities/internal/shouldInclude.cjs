"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldInclude = shouldInclude;
const invariant_1 = require("@apollo/client/utilities/invariant");
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function shouldInclude({ directives }, variables) {
    if (!directives || !directives.length) {
        return true;
    }
    return getInclusionDirectives(directives).every(({ directive, ifArgument }) => {
        let evaledValue = false;
        if (ifArgument.value.kind === "Variable") {
            evaledValue =
                variables && variables[ifArgument.value.name.value];
            (0, invariant_1.invariant)(evaledValue !== void 0, 15, directive.name.value);
        }
        else {
            evaledValue = ifArgument.value.value;
        }
        return directive.name.value === "skip" ? !evaledValue : evaledValue;
    });
}
function isInclusionDirective({ name: { value } }) {
    return value === "skip" || value === "include";
}
function getInclusionDirectives(directives) {
    const result = [];
    if (directives && directives.length) {
        directives.forEach((directive) => {
            if (!isInclusionDirective(directive))
                return;
            const directiveArguments = directive.arguments;
            const directiveName = directive.name.value;
            (0, invariant_1.invariant)(directiveArguments && directiveArguments.length === 1, 16, directiveName);
            const ifArgument = directiveArguments[0];
            (0, invariant_1.invariant)(ifArgument.name && ifArgument.name.value === "if", 17, directiveName);
            const ifValue = ifArgument.value;
            // means it has to be a variable value if this is a valid @skip or @include directive
            (0, invariant_1.invariant)(ifValue &&
                (ifValue.kind === "Variable" || ifValue.kind === "BooleanValue"), 18, directiveName);
            result.push({ directive, ifArgument });
        });
    }
    return result;
}
//# sourceMappingURL=shouldInclude.cjs.map
