module.exports = main => {
 const exports = main.exports;

 exports.selectServer = async ({ device, servers, defaultServer, excludeServers, middleware, argstr }) => {
  // Set defaultServer to false if you don't want it to be used.
  if (!servers) {
   servers = (device.session
    ? [...device.session.servers.values()]
    : [...exports.devices.keys()].filter(device => !device.isClient())
   );
  }
  else if (!Array.isArray(servers)) {
   servers = (servers[Symbol.iterator]
    ? [...(servers instanceof Map ? servers.values() : servers)]
    : [servers]
   );
  }
  if (Array.isArray(excludeServers)) servers = servers.filter(server => !excludeServers.includes(server));
  if (servers.length === 0) {
   device.tell(`No servers to choose from.`);
   throw 'noServers';
  }
  if (defaultServer === undefined) defaultServer = device.getServer();
  if (defaultServer && !servers.includes(defaultServer)) defaultServer = undefined;
  if (!argstr) {
   if (defaultServer && typeof defaultServer === 'object') return defaultServer;
   else if (servers.length === 1) return servers[0];
  }
  const { choiceIndex } = await middleware.menu({
   argstr: (argstr || undefined),
   choices: servers.map(server => server.name || server.title()),
   invalidSelectionMessage: `Found no server by that name.`,
  });
  return servers[choiceIndex];
 };
};
