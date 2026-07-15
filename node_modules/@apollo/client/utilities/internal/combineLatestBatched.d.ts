import { Observable } from "rxjs";
/**
 * Like `combineLatest` but with some differences:
 *
 * - It only works on arrays as an input
 * - Batches updates to each array index that contains a referentially equal
 *   observable
 * - Doesn't allow for custom scheduler
 * - Expects array of constructed observables instead of `Array<ObservableInput>`
 */
export declare function combineLatestBatched<T>(observables: Array<Observable<T> & {
    dirty?: boolean;
}>): Observable<T[]>;
//# sourceMappingURL=combineLatestBatched.d.ts.map