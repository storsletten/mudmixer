module.exports = (main, middleware) => {
 const exports = main.exports;

 // Supported packages:
 const packages = {
  'mcp-negotiate': { minVersion: '1.0', maxVersion: '1.0' },
  'dns-org-mud-moo-simpleedit': { minVersion: '1.0', maxVersion: '1.0' },
  'dns-com-awns-status': { minVersion: '1.0', maxVersion: '1.0' },
  'dns-com-awns-ping': { minVersion: '1.0', maxVersion: '1.0' },
  'dns-com-vmoo-client': { minVersion: '1.0', maxVersion: '1.0' },
 };

 middleware.setServerCommand('#$#mcp-negotiate-can', ({ device, argstr }) => {
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

 middleware.setServerCommand('#$#mcp-negotiate-end', ({ device, argstr }) => {
  if (!device.mcp) return;
  else if (!argstr.startsWith(device.mcp.authKey || '')) return;
  else if (device.mcp.packages['mcp-negotiate']) {
   for (let name in packages) {
    device.tellServer(`#$#mcp-negotiate-can ${device.mcp.authKey} package: ${name} min-version: ${packages[name].minVersion || '1.0'} max-version: ${packages[name].maxVersion || '1.0'}`);
   }
   device.tellServer(`#$#mcp-negotiate-end ${device.mcp.authKey}`);
   device.tellServer(`#$#dns-com-vmoo-client-info ${device.mcp.authKey} name: ${exports.utils.titlify(exports.package.name).replace(/\s/g, '_')} text-version: "v${exports.package.version}" internal-version: 0 reg-id: 0 flags: p`);
  }
 });
};
