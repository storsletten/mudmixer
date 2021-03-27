module.exports = (main, middleware) => {
 const exports = main.exports;
 const device = exports.device;

 device.events.on('remoteSocketClose', () => {
  if (device.readHistory.length > 1 && device.serverOptions && device.serverOptions.reconnect && !device.serverOptions.reconnectAggressively) {
   for (let i = (device.readHistory.length - 2); i < device.readHistory.length; i++) {
    const line = device.readHistory[i].line;
    if (line.startsWith('*** Server shutdown')) {
     device.prepareReconnect();
     break;
    }
   }
  }
 });
};
