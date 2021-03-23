module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `name`,
  aliases: ['cc', 'connect-connection', 'reconnect-connection'],
  help: [
   `This command connects / reconnects an existing outgoing (server) connection within the current session.`,
  ],
  action: function({ device, argstr }) {
   const serverName = argstr.trim();
   if (!serverName) return device.tell(`Syntax: ${this.name} ${this.syntax}`);
   const server = device.session.getServer(serverName);
   if (!server) return device.tell(`There is no connection with that name.`);
   if (server.serverOptions.disabled) {
    server.serverOptions.disabled = false;
    device.session.save();
   }
   server.reconnect();
   device.switchServer(server);
  },
 };
};
