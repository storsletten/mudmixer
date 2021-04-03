module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `name`,
  aliases: ['cp', 'cpermit', 'permit-connection'],
  help: [
   `This command is used to manually authorize a TLS connection that has an invalid certificate.`,
  ],
  action: async function({ device, middleware, argstr }) {
   const server = await middleware.selectServer({ argstr });
   if (server.socket ? (server.socket.authorized === undefined) : !server.config.tls) device.tell(`That connection does not use TLS.`);
   else {
    server.tlsAuthorizeOverride = !server.tlsAuthorizeOverride;
    device.tell(`${server.tlsAuthorizeOverride ? 'Enabled' : 'Disabled'} TLS authorization override for ${server.name || server.title()}.`);
   }
  },
 };
};
