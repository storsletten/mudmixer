module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: ``,
  commands: [`${exports.config.mxCommand || 'mx'}sk`],
  aliases: ['sk', 'skill', 'kill-session'],
  help: [
   `This command disconnects all server connections associated with the current session.`,
  ],
  action: function({ device, argstr }) {
   const session = device.session;
   if (session.servers.size === 0) return device.tell(`This session has no servers to kill.`);
   const killedServers = [];
   session.servers.forEach(server => {
    if (server.config.disabled !== true) {
     server.config.disabled = true;
     server.disconnect();
     killedServers.push(server);
    }
   });
   if (killedServers.length === 0) device.tell(`${session.servers.size === 1 ? `The server connection is` : `All server connections are`} already disconnected.`);
   else {
    if (killedServers.length > 1) device.tell(`Total: ${killedServers.length}`);
    session.save();
   }
  },
 };
};
