// This script handles special negotiation with Proxiani.
// Since Proxiani is specificly designed for use with Miriani, this script will automatically load the miriani middleware when Proxiani is detected (unless it's already loaded).

module.exports = (main, middleware) => {
 const exports = main.exports;

 middleware.setServerCommand('#$#px', ({ device, argstr, options }) => {
  options.noForwarding = false;
  const match = argstr.match(/^version (\d{1,5}\.\d{1,5}\.\d{1,5})$/);
  if (match) {
   device.tellServer(`#$#mx version ${exports.package.version || 'unknown'}`);
   if (!middleware.packages.has('miriani')) middleware.loadPackage('miriani');
  }
 });
};
