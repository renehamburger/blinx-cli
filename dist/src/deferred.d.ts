export declare class Deferred<T> {
    readonly promise: Promise<T>;
    private fate;
    private state;
    private resolveCallback;
    private rejectCallback;
    constructor();
    resolve(value?: any): void;
    reject(reason?: any): void;
    isResolved(): boolean;
    isPending(): boolean;
    isFulfilled(): boolean;
    isRejected(): boolean;
}
