module.exports = (main, middleware) => {
 const exports = main.exports;

 middleware.setCommand('#$#dns-com-awns-ping', ({ device, argstr }) => {
  if (!device.mcp) return;
  else if (!argstr.startsWith(device.mcp.authKey || '')) return;
  else device.tell(`#$#dns-com-awns-ping-reply ${argstr}`);
 });
};
