module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `name`,
  aliases: ['cr', 'cremove', 'remove-connection'],
  help: [
   `This command removes an outgoing (server) connection from the current session.`,
  ],
  action: function({ device, argstr }) {
   const lookupName = argstr.trim();
   if (!lookupName) return device.tell(`Syntax: ${this.name} ${this.syntax}`);
   const server = device.session.getServer(lookupName);
   if (!server) return device.tell(`There is no connection with that name.`);
   const serverName = server.name || server.title();
   device.session.removeServer(server.serverOptions);
   device.tell(`Removed ${serverName}.`);
   device.session.save();
  },
 };
};
