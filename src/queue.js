// Circular buffer storage. Externally-apparent 'length' increases indefinitely
// while any items with indexes below length-n will be forgotten (undefined
// will be returned if you try to get them, trying to set is an exception).
// n represents the initial length of the array, not a maximum
class CircularBuffer {
  constructor(n) {
    this._array = new Array(n);
    this.length = 0;
  }

  get(i) {
    if (i < 0 || i < this._array.length)
      return undefined;
    return this._array[i];
  }

  set(idx, item) {
    if (idx < 0 || idx < this.length - this._array.length)
      throw CircularBuffer.IndexError;
    while (idx > this.length) {
      this._array[this.length % this._array.length] = undefined;
      this.length++;
    }
    this._array[idx] = item;
    if (idx === this.length)
      this.length++;
  }

  append(item) {

  }
}

CircularBuffer.IndexError = {};
