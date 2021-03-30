module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `[name]`,
  commands: ['mxg'],
  aliases: ['g', 'cg', 'cgag', 'gag-connection'],
  help: [
   `This command toggles gagging of a connection.`,
   `If no name is provided, then this command toggles gagging of all connections except those that you are currently set to transmit to.`,
  ],
  action: function({ device, argstr }) {
   const servers = device.getServers(device.pipesFrom);
   if (servers.length === 0) return device.tell(`There are no servers streaming to your connection.`);
   else if (!argstr) {
    const gag = (device.ignore.size === 0);
    if (gag) {
     const gagServers = servers.filter(server => !device.readPipes.has(server));
     if (gagServers.length === 0) device.tell(`There are no other servers to gag.`);
     else {
      gagServers.forEach(server => device.ignore.add(server));
      device.tell(`Gagging output from ${exports.utils.englishList(gagServers.map(server => server.name || server.title()).sort())}.`);
     }
    }
    else {
     device.ignore.clear();
     device.tell(`Ungagging output from ${exports.utils.englishList(servers.map(server => server.name || server.title()).sort())}.`);
    }
   }
   else {
    const serverName = argstr.trim();
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
