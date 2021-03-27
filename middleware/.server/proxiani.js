// This script handles special negotiation with Proxiani.

module.exports = (main, middleware) => {
 const exports = main.exports;

 middleware.setServerCommand('#$#px', ({ device, argstr, options }) => {
  options.noForwarding = false;
  const match = argstr.match(/^version (\d{1,5}\.\d{1,5}\.\d{1,5})$/);
  if (match) {
   device.tellServer(`#$#mx version ${exports.package.version || 'unknown'}`);
   device.events.on('remoteSocketClose', () => device.prepareReconnect(500));
  }
 });
};
