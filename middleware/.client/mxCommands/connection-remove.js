module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `name`,
  commands: ['mxcr'],
  aliases: ['cr', 'cremove', 'remove-connection'],
  help: [
   `This command removes an outgoing (server) connection from the current session.`,
  ],
  action: async function({ device, middleware, argstr }) {
   const server = await middleware.selectServer({ argstr });
   await middleware.confirm({
    message: `Are you sure you wish to remove the connection named ${server.name || server.title()}?`,
    noMessage: `Not removing it.`,
   });
   const serverName = server.name || server.title();
   device.session.removeServer(server.serverOptions);
   device.tell(`Removed ${serverName}.`);
   device.session.save();
  },
 };
};
