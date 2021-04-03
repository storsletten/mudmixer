module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `[text]`,
  commands: [`${exports.config.mxCommand || ''}pass`],
  help: [
   `Sends the text directly to the server(s) that you are currently transmitting to, bypassing all middleware.`,
  ],
  action: async function({ device, middleware, argstr }) {
   if (!device.hasActiveServers()) return device.tell(`You are not connected to any servers.`);
   const lines = (argstr ? [argstr] : (await middleware.prompt({ multiline: true, abortOnBlank: true, message: `Enter the text that you want to send:` })));
   const servers = device.getActiveServers();
   if (servers.length === 0) device.tell(`You are not connected to any servers.`);
   else {
    servers.forEach(server => server.write({ device, lines, skipMiddleware: true }));
    device.tell(`Sent.`);
   }
  },
 };
};
