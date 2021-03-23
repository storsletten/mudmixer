module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `name`,
  aliases: ['cd', 'disconnect-connection'],
  help: [
   `This command disconnects an outgoing (server) connection within the current session.`,
  ],
  action: function({ device, argstr }) {
   const serverName = argstr.trim();
   if (!serverName) return device.tell(`Syntax: ${this.name} ${this.syntax}`);
   const server = device.session.getServer(serverName);
   if (!server) device.tell(`There is no connection with that name.`);
   else if (server.serverOptions.disabled === true) device.tell(`${server.name || server.title()} is already disabled.`);
   else {
    server.serverOptions.disabled = true;
    server.disconnect();
    device.session.save();
   }
  },
 };
};
