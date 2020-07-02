// Based on https://romkevandermeulen.nl/2016/09/18/deferred-typescript.html
export class Deferred<T> {
  public readonly promise: Promise<T>;
  private fate: 'resolved' | 'unresolved';
  private state: 'pending' | 'fulfilled' | 'rejected';
  private resolveCallback!: (result: T) => void;
  private rejectCallback!: (err: any) => void;

  constructor() {
    this.state = 'pending';
    this.fate = 'unresolved';
    this.promise = new Promise((resolve, reject) => {
      this.resolveCallback = resolve;
      this.rejectCallback = reject;
    });
    this.promise.then(
      () => (this.state = 'fulfilled'),
      () => (this.state = 'rejected')
    );
  }

  resolve(value?: any) {
    if (this.fate === 'resolved') {
      throw new Error('Deferred cannot be resolved twice');
    }
    this.fate = 'resolved';
    this.resolveCallback(value);
  }

  reject(reason?: any) {
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
