const os = require('os');

module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: ``,
  commands: [`${exports.config.mxCommand || 'mx'}us`],
  help: [
   `Shows resource usage information.`,
  ],
  action: function({ device }) {
   const mem = process.memoryUsage();
   device.tell(`Memory Usage:`);
   device.tell(`- RSS: ${exports.utils.formatBytes(mem.rss)}.`);
   device.tell(`- Heap Used: ${exports.utils.formatBytes(mem.heapUsed)}.`);
   device.tell(`- Heap Total: ${exports.utils.formatBytes(mem.heapTotal)}.`);
   device.tell(`- Free Total: ${exports.utils.formatBytes(os.freemem())}.`);
   device.tell();
   device.tell(`Network Data Usage:`);
   device.tell(`- ${exports.utils.formatBytes(device.socket.bytesWritten)} sent to your current client connection.`);
   device.tell(`- ${exports.utils.formatBytes(device.socket.bytesRead)} received from your current client connection.`);
   device.getServers().forEach(server => {
    if (server.socket) {
     const name = server.name || server.title();
     device.tell(`- ${exports.utils.formatBytes(server.socket.bytesWritten)} sent to current ${name} connection.`);
     device.tell(`- ${exports.utils.formatBytes(server.socket.bytesRead)} received from current ${name} connection.`);
    }
   });
  },
 };
};
