module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `option`,
  aliases: ['co', 'coptions'],
  help: [
   `This command changes options for an outgoing (server) connection.`,
  ],
  action: async function({ device, middleware, argstr }) {
   const server = device.getServer();
   if (!server) return device.tell(`You are not connected to a server.`);
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
     description: `When reconnectAggressively is enabled, it will auto reconnect even when the connection was deliberately terminated by the server.`,
     type: 'boolean',
    },
    reconnectInterval: {
     name: 'Reconnect Interval',
     message: `Enter an interval for reconnect attempts (in milliseconds):`,
     type: 'number',
    },
    bufferTTL: {
     name: 'Buffer TTL',
     description: [
      `Buffer TTL (time to live) determines how long (in milliseconds) that incoming data can be buffered before its flushed. This is helpful on MUDs that don't always send an end-of-line or end-of-record signal, but it can also cause problems on slow or laggy connections.`,
      `Set Buffer TTL to 0 if you wish to disable that feature.`,
     ],
     type: 'number',
    },
    acceptLocalEdit: {
     name: 'Accept Local Edit Requests',
     description: `When this option is enabled, local edit requests from the server will be accepted.`,
     type: 'boolean',
    },
   };
   const session = device.session;
   middleware.optionsMenu({
    device,
    template,
    argstr,
    options: server.serverOptions,
    saveCallback: session.save.bind(session),
   });
  },
 };
};
