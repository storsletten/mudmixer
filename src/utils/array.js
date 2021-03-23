module.exports = main => {
 // Note that ChainableArray often has worse performance than native arrays because it needs to remake the original instance in some cases.
 // I recommend it for relatively small arrays when convenience is of the essence.
 // If you dislike it, then bite me. You are also welcome to not use it.
 class ChainableArray extends Array {
  // Introducing some new methods:
  clear() {
   super.splice(0);
   return this;
  }
  remake(...newElements) {
   super.splice(0, this.length, ...newElements);
   return this;
  }
  removeDuplicates() {
   const newList = new Set(this);
   if (newList.size < this.length) this.remake(...newList);
   return this;
  }

  // Now chainifying instance methods that it makes sense to chain.
  concat(...args) { return this.remake(...super.concat(...args)); }
  // .copyWithin() is chainable.
  // .fill() is chainable.
  filter(...args) { return this.remake(...super.filter(...args)); }
  forEach(...args) {
   super.forEach(...args);
   return this;
  }
  map(...args) { return this.remake(...super.map(...args)); }
  pop(...args) {
   super.pop(...args);
   return this;
  }
  push(...args) {
   super.push(...args);
   return this;
  }
  // .reverse() is chainable.
  shift(...args) {
   super.shift(...args);
   return this;
  }
  // .sort() is chainable.
  splice(...args) {
   super.splice(...args);
   return this;
  }
  unshift(...args) {
   super.unshift(...args);
   return this;
  }
 }

 return ChainableArray;
};
