module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `[name]`,
  commands: ['mxci'],
  aliases: ['ci', 'cinfo', 'info-connections'],
  help: [
   `This command shows information about a connection.`,
   `If no name is provided, this command lists the outgoing (server) connections associated with the current session.`,
  ],
  action: function({ device, argstr }) {
   if (device.session.servers.size === 0) return device.tell(`There are no server connections to view in ${device.session.title()}.`);
   const serverName = argstr.trim();
   if (serverName) {
    const server = device.session.getServer(serverName);
    if (!server) device.tell(`There is no connection with that name.`);
    else device.tell(server.serverOptions);
   }
   else {
    const header = ['Name', 'Host', 'Port'];
    const rows = [];
    for (let [lcName, server] of device.session.servers) {
     const { host, port, tls } = server.serverOptions;
     rows.push([server.name, host, (tls ? 'TLS' : '') + String(port)]);
    }
    device.tell(exports.utils.padTableColumns([header, ...rows.sort((a, b) => a[0] > b[0])]).map(row => row.join(' ')));
   }
  },
 };
};
