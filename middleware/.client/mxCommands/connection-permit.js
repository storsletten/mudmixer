module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `name`,
  aliases: ['cp', 'cpermit', 'permit-connection'],
  help: [
   `This command is used to manually authorize a TLS connection that has an invalid certificate.`,
  ],
  action: function({ device, argstr }) {
   const serverName = argstr.trim();
   if (!serverName) return device.tell(`Syntax: ${this.name} ${this.syntax}`);
   const server = device.session.getServer(serverName);
   if (!server) device.tell(`There is no connection named ${serverName}.`);
   else if (server.socket ? (server.socket.authorized === undefined) : !server.serverOptions.tls) device.tell(`That connection does not use TLS.`);
   else {
    server.tlsAuthorizeOverride = !server.tlsAuthorizeOverride;
    device.tell(`${server.tlsAuthorizeOverride ? 'Enabled' : 'Disabled'} TLS authorization override for ${server.name}.`);
   }
  },
 };
};
