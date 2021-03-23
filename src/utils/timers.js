module.exports = main => {
 const exports = main.exports;

 class Timers extends Map {
  constructor() {
   // Do not accept arguments.
   super();
  }

  clear() {
   super.forEach(timer => clearTimeout(timer));
   return super.clear();
  }

  delete(key) {
   const timer = super.get(key);
   if (timer) clearTimeout(timer);
   return super.delete(key);
  }

  set(key, timer) {
   // Keep in mind that if you set a timeout using this method, then it will not be automatically removed once it runs.
   // This is not an issue unless you need to be able to check if the timer is still pending.
   const existing = super.get(key);
   if (existing) clearTimeout(existing);
   return super.set(key, timer);
  }

  setInterval(key, interval, callback, ...args) {
   return this.set(key, setInterval(callback, interval, ...args));
  }

  setTimeout(key, delay, callback, ...args) {
   return this.set(key, setTimeout((...params) => super.delete(key) && callback(...params), delay, ...args));
  }
 }

 return Timers;
};
