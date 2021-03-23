module.exports = main => {
 const exports = main.exports;

 Object.assign(exports.utils,
  ...['strings', 'external', 'objects', 'crypto', 'node', 'watchers'].map(name => require(`./${name}.js`)(main)),
  {
   fs: require('./fs.js')(main),
   ChainableArray: require('./array.js')(main),
   Events: require('./events.js')(main),
   Timers: require('./timers.js')(main),
  }
 );
};
