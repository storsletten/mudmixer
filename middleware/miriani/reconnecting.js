module.exports = (main, middleware) => {
 const exports = main.exports;
 const device = middleware.device;

 device.events.on('remoteSocketClose', () => {
  if (device.readHistory.length > 1 && device.serverOptions && device.serverOptions.reconnect && !device.serverOptions.reconnectAggressively) {
   for (let i = Math.max(0, device.readHistory.length - 3); i < device.readHistory.length; i++) {
    const line = device.readHistory[i].line;
    if (line.startsWith('*** Server shutdown') || line.startsWith('*** Shutting down')) {
     // "Server shutdown" is typically when a host is gracefully shutting down Miriani.
     // "Shutting down" is used when the server is abruptly shutting down, such as when the server panics.
     device.prepareReconnect();
     break;
    }
    else if (line.startsWith('*** PX restart') || line.startsWith('*** PX shutting down')) {
     device.prepareReconnect(500);
     break;
    }
    else if (line === '*** Disconnected ***') break;
   }
  }
 });
};
