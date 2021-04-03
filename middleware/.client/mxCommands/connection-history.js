module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `name`,
  commands: [`${exports.config.mxCommand || ''}ch`],
  aliases: ['ch', 'chistory', 'history-connection'],
  help: [
   `This command shows the most recent messages received from a server.`,
  ],
  action: async function({ device, middleware, argstr }) {
   const server = await middleware.selectServer({ argstr });
   if (server.readHistory.length === 0) return device.tell(`There is no history to show for ${server.name || server.title()}.`);
   device.tell(`Showing ${server.readHistory.length} ${server.readHistory.length === 1 ? 'message' : 'messages'}:`);
   device.tell(server.readHistory.map(data => `  [${exports.utils.formatTimeMS(data.time)}] ${data.line}`));
  },
 };
};
