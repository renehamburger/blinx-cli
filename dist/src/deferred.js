"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Deferred = void 0;
// Based on https://romkevandermeulen.nl/2016/09/18/deferred-typescript.html
class Deferred {
    constructor() {
        this.state = 'pending';
        this.fate = 'unresolved';
        this.promise = new Promise((resolve, reject) => {
            this.resolveCallback = resolve;
            this.rejectCallback = reject;
        });
        this.promise.then(() => (this.state = 'fulfilled'), () => (this.state = 'rejected'));
    }
    resolve(value) {
        if (this.fate === 'resolved') {
            throw new Error('Deferred cannot be resolved twice');
        }
        this.fate = 'resolved';
        this.resolveCallback(value);
    }
    reject(reason) {
        if (this.fate === 'resolved') {
            throw new Error('Deferred cannot be resolved twice');
        }
        this.fate = 'resolved';
        this.rejectCallback(reason);
    }
    isResolved() {
        return this.fate === 'resolved';
    }
    isPending() {
        return this.state === 'pending';
    }
    isFulfilled() {
        return this.state === 'fulfilled';
    }
    isRejected() {
        return this.state === 'rejected';
    }
}
exports.Deferred = Deferred;
