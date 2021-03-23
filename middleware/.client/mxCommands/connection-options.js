module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `name`,
  aliases: ['co', 'coptions'],
  help: [
   `This command changes options for an outgoing (server) connection.`,
  ],
  action: function({ device, middleware, argstr }) {
   const serverName = argstr.trim();
   if (!serverName) return device.tell(`Syntax: ${this.name} ${this.syntax}`);
   const server = device.session.getServer(serverName);
   if (!server) return device.tell(`There is no connection with that name.`);
   const template = {
    host: {
     name: 'Host Name',
     type: 'string',
    },
    port: {
     name: 'Port Number',
     type: 'number',
    },
    tls: {
     name: 'TLS',
     type: 'boolean',
    },
    loginCommand: {
     name: 'Login Command',
     type: 'string',
    },
    reconnect: {
     name: 'Auto Reconnect',
     type: 'boolean',
    },
    reconnectAggressively: {
     name: 'Aggressive Auto Reconnect',
     type: 'boolean',
    },
    reconnectInterval: {
     name: 'Reconnect Interval',
     type: 'number',
    },
    acceptLocalEdit: {
     name: 'Accept Local Edit Requests',
     type: 'boolean',
    },
   };
   const session = device.session;
   middleware.optionsMenu({
    device,
    template,
    options: server.serverOptions,
    saveCallback: session.save.bind(session),
   });
  },
 };
};
