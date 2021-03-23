module.exports = (main, middleware) => {
 const exports = main.exports;

 middleware.setServerCommand('#$#dns-com-awns-ping', ({ device, argstr }) => {
  if (!device.mcp) return;
  else if (!argstr.startsWith(device.mcp.authKey || '')) return;
  else device.tellServer(`#$#dns-com-awns-ping-reply ${argstr}`);
 });
};
