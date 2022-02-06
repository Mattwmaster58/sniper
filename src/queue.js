class FixedFIFO {
  constructor(size) {
    this.size = size;
    this._arr = []
  }

  push(elem) {
    this._arr.splice(0, this._arr.length - this.size, elem)

    if (this._arr.length > this.size) {
      this._arr.pop();
    }
  }
  slice(x, y) {
    return this._arr.slice(x, y);
  }

  get(i) {
    return this._arr[i];
  }
}

module.exports = FixedFIFO;
