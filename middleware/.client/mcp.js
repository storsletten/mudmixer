// MCP specification:
// https://www.moo.mud.org/mcp2/mcp2.html

module.exports = (main, middleware) => {
 const exports = main.exports;

 // Supported packages:
 const packages = {
  'mcp-negotiate': { minVersion: '1.0', maxVersion: '2.1' },
  'dns-org-mud-moo-simpleedit': { minVersion: '1.0', maxVersion: '1.0' },
  'dns-com-awns-status': { minVersion: '1.0', maxVersion: '1.0' },
  'dns-com-awns-ping': { minVersion: '1.0', maxVersion: '1.0' },
  'dns-com-vmoo-client': { minVersion: '1.0', maxVersion: '1.0' },
 };

 middleware.setCommand('#$#mcp', ({ device, argstr }) => {
  if (!device.session) return;
  else {
   const match = argstr.match(/^authentication-key: (.+?) version: ([^ ]+) to: ([^ ]+)$/);
   if (match) {
    const authKey = match[1];
    const oldMCP = device.mcp;
    const newMCP = {
     version: match[2],
     to: match[3],
     authKey,
     packages: {},
    };
    device.mcp = newMCP;
    for (let package in packages) {
     const { minVersion, maxVersion } = packages[package];
     device.tell(`#$#mcp-negotiate-can ${authKey} package: ${package} min-version: ${minVersion || '0.0'} max-version: ${maxVersion || '0.0'}`);
    }
    device.events.emit('registerMCP', newMCP, oldMCP);
    device.tell(`#$#mcp-negotiate-end ${authKey}`);
   }
  }
 });
};
