module.exports = async (main, middleware) => {
 const exports = main.exports;
 const device = middleware.device;
 if (device.isClient()) throw new Error(`This middleware is designed for server connections only.`);

 require('./registerSoundpack.js')(main, middleware);
};
