module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `[name]`,
  aliases: ['si', 'sinfo', 'info-sessions'],
  help: [
   `This command shows information about a session.`,
   `If no name is provided, this command lists all sessions.`,
  ],
  action: function({ device, argstr }) {
   const sessionName = argstr.trim();
   if (sessionName) {
    const session = exports.getSession(sessionName);
    if (!session) device.tell(`There is no session with that name.`);
    else {
     device.tell(session.name || session.title());
     device.tell(`Clients: ${session.clients.size}`);
     if (session.clients.size > 0) {
      const header = ['Address', 'Port'];
      const rows = [];
      for (let client of session.clients) {
       rows.push(client.socket ? [exports.utils.formatIPAddress(client.socket.remoteAddress || 'N/A'), String(client.socket.localPort || 'N/A')] : ['N/A', 'N/A']);
      }
      device.tell(exports.utils.padTableColumns([header, ...rows]).map(row => row.join(' ')));
     }
     device.tell(`Servers: ${session.servers.size}`);
     if (session.servers.size > 0) {
      const header = ['Name', 'Host', 'Port'];
      const rows = [];
      for (let [lcName, server] of session.servers) {
       const { host, port, tls } = server.serverOptions;
       rows.push([server.name, host, (tls ? 'TLS' : '') + String(port)]);
      }
      device.tell(exports.utils.padTableColumns([header, ...rows.sort((a, b) => a[0] > b[0])]).map(row => row.join(' ')));
     }
    }
   }
   else {
    const header = ['Name', 'Clients', 'Servers'];
    const rows = [];
    for (let [lcName, session] of exports.sessions) {
     rows.push([session.name || session.title(), String(session.clients.size), String(session.servers.size)]);
    }
    device.tell(exports.utils.padTableColumns([header, ...rows.sort((a, b) => a[0] > b[0])]).map(row => row.join(' ')));
   }
  },
 };
};
