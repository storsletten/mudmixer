module.exports = async (main, middleware) => {
 const exports = main.exports;
 const device = middleware.device;
 if (!device.isClient()) throw new Error(`This middleware is designed for client connections only.`);

 require('./connect.js')(main, middleware);
 require('./registerSoundpack.js')(main, middleware);
 require('./unregisterSoundpack.js')(main, middleware);
};
