module.exports = async (main, middleware) => {
 const exports = main.exports;
 const device = middleware.device;
 if (device.isClient()) throw new Error(`This middleware is designed for server connections only.`);

 require('./mcp.js')(main, middleware);
 require('./mcpNegotiate.js')(main, middleware);
 require('./mcpPing.js')(main, middleware);
 require('./mcpSimpleEdit.js')(main, middleware);
 require('./mcpStatus.js')(main, middleware);

 require('./registerSoundpack.js')(main, middleware);
 require('./unregisterSoundpack.js')(main, middleware);

 require('./proxiani.js')(main, middleware);
};
