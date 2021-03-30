module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `[name]`,
  commands: ['mxc'],
  aliases: ['c', 'cs', 'cswitch', 'switch-connection'],
  help: [
   `This command switches your focus to the specified outgoing (server) connection within the current session.`,
   `If no name is provided, this command shows you the server(s) that you are currently ready to transmit to.`,
  ],
  action: function({ device, argstr }) {
   const serverName = argstr.trim();
   const connectedServers = device.getServers();
   if (!serverName) {
    if (connectedServers.length === 0) device.tell(`You are not transmitting to any servers.`);
    else if (connectedServers.length === 1) device.tell(`Currently set to transmit to ${connectedServers[0].name || connectedServers[0].title()}.`);
    else {
     device.tell(`Currently set to transmit to ${connectedServers.length} servers:`);
     device.tell(connectedServers.map(server => `  ${server.name || server.title()}`).sort());
    }
    if (device.ignore.size > 0) {
     device.tell(`You are ignoring ${exports.utils.englishList([...device.ignore].map(device => device.name || device.title()).sort())}.`);
    }
   }
   else {
    const server = device.session.getServer(serverName);
    if (!server) device.tell(`There is no connection with that name.`);
    else if (connectedServers.includes(server)) device.tell(`You are already transmitting to ${server.name || server.title()}.`);
    else {
     device.switchServer(server);
     if (device.ignore.delete(server)) device.tell(`${server.name} (ungagged)`);
     else device.tell(server.name);
    }
   }
  },
 };
};
