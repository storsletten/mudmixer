module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `name`,
  aliases: ['ch', 'chistory', 'history-connection'],
  help: [
   `This command shows the most recent messages received from a server.`,
  ],
  action: function({ device, argstr }) {
   const lookupName = argstr.trim();
   if (!lookupName) return device.tell(`Syntax: ${this.name} ${this.syntax}`);
   const server = device.session.getServer(lookupName);
   if (!server) return device.tell(`There is no connection with that name.`);
   else if (server.readHistory.length === 0) return device.tell(`There is no history to show for ${server.name || server.title()}.`);
   device.tell(`Showing ${server.readHistory.length} ${server.readHistory.length === 1 ? 'message' : 'messages'}:`);
   device.tell(server.readHistory.map(data => `  [${exports.utils.formatTimeMS(data.time)}] ${data.line}`));
  },
 };
};
