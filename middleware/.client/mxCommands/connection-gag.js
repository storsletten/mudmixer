module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `[name]`,
  commands: ['mxg'],
  aliases: ['g', 'cg', 'cgag', 'gag-connection'],
  help: [
   `This command toggles gagging of a connection.`,
   `If no name is provided, then this command toggles gagging of all connections.`,
  ],
  action: function({ device, argstr }) {
   const servers = device.getServers();
   if (servers.length === 0) return device.tell(`You are not connected to any servers.`);
   const serverName = argstr.trim();
   if (!serverName) {
    const gag = (device.ignore.size === 0);
    if (gag) servers.forEach(server => device.ignore.add(server));
    else device.ignore.clear();
    device.tell(`${gag ? 'Gagging' : 'Ungagging'} output from ${exports.utils.englishList(servers.map(server => server.name || server.title()).sort())}.`);
   }
   else {
    const server = device.session.getServer(serverName);
    if (!server) return device.tell(`There is no connection with that name.`);
    else {
     const gag = !device.ignore.has(server);
     if (gag) device.ignore.add(server);
     else device.ignore.delete(server);
     device.tell(`${gag ? 'Gagging' : 'Ungagging'} output from ${server.name || server.title()}.`);
    }
   }
  },
 };
};
