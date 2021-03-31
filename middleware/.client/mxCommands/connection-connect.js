module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `name`,
  commands: ['mxcc'],
  aliases: ['cc', 'connect-connection', 'reconnect-connection'],
  help: [
   `This command connects / reconnects an existing outgoing (server) connection within the current session.`,
  ],
  action: async function({ device, middleware, argstr }) {
   const server = await middleware.selectServer({ argstr });
   if (server.serverOptions.disabled) {
    server.serverOptions.disabled = false;
    device.session.save();
   }
   server.reconnect();
   device.switchServer(server);
  },
 };
};
