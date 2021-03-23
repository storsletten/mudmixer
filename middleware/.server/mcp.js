const crypto = require('crypto');

// MCP specification:
// https://www.moo.mud.org/mcp2/mcp2.html

module.exports = (main, middleware) => {
 const exports = main.exports;

 middleware.setServerCommand('#$#mcp', ({ device, argstr }) => {
  const match = argstr.match(/^version: ([^ ]+) to: ([^ ]+)$/);
  if (match) {
   const oldMCP = device.mcp;
   const newMCP = {
    version: match[1],
    to: match[2],
    authKey: crypto.randomBytes(3).toString('hex'),
    packages: {},
   };
   device.mcp = newMCP;
   device.events.emit('registerMCP', newMCP, oldMCP);
   if (device.mcp && device.mcp.authKey) {
    device.tellServer(`#$#mcp authentication-key: ${newMCP.authKey} version: 1.0 to: 2.1`);
   }
  }
 });
};
