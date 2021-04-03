module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `name`,
  commands: [`${exports.config.mxCommand || ''}ck`],
  aliases: ['ck', 'ckill', 'kill-connection'],
  help: [
   `This command disconnects an outgoing (server) connection within the current session.`,
  ],
  action: async function({ device, middleware, argstr }) {
   const server = await middleware.selectServer({ argstr });
   if (server.serverOptions.disabled === true) device.tell(`${server.name || server.title()} is already killed.`);
   else server.disconnect();
  },
 };
};
