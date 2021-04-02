module.exports = (main, middleware) => {
 const exports = main.exports;

 middleware.setCommand('#$#mcp-negotiate-can', ({ device, argstr }) => {
  if (!device.mcp) return;
  else if (!argstr.startsWith(device.mcp.authKey || '')) return;
  else {
   const match = argstr.match(/package: ([^ ]+) min-version: ([^ ]+) max-version: ([^ ]+)$/);
   if (match) {
    const name = match[1];
    const oldPackage = device.mcp.packages[name];
    const newPackage = {
     name,
     minVersion: match[2],
     maxVersion: match[3],
    };
    device.mcp.packages[name] = newPackage;
    device.events.emit('registerMCPPackage', newPackage, oldPackage);
   }
  }
 });

 middleware.setCommand('#$#mcp-negotiate-end', ({ device, argstr }) => {
  if (!device.mcp) return;
  else if (!argstr.startsWith(device.mcp.authKey || '')) return;
  else device.events.emit('mcpNegotiateEnd');
 });
};
