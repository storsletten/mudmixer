module.exports = (main, middleware) => {
 const exports = main.exports;

 middleware.setServerCommand('#$#dns-com-awns-status', ({ device, argstr }) => {
  if (!device.mcp) return;
  else if (!argstr.startsWith(device.mcp.authKey || '')) return;
  else {
   const oldStatus = device.mcp.status;
   const newStatus = argstr.slice(device.mcp.authKey.length + 1);
   device.mcp.status = newStatus;
   device.events.emit('mcpStatus', newStatus, oldStatus);
  }
 });
};
