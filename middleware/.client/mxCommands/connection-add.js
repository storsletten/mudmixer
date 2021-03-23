module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `hostname ["TLS"]port [loginCommand]`,
  aliases: ['ca', 'cadd', 'add-connection'],
  help: [
   `This command adds a new outgoing connection to the current session.`,
  ],
  action: function({ device, argstr }) {
   const serverOptions = exports.parseServerString(argstr);
   if (!serverOptions) return device.tell(`Syntax: ${this.name} ${this.syntax}`);
   let counter = 1;
   const originalServerName = serverOptions.name;
   while (device.session.getServer(serverOptions.name)) serverOptions.name = `${++counter}${originalServerName}`;
   const server = device.session.addServer(serverOptions);
   device.tell(`Added ${serverOptions.name}.`);
   device.switchServer(server);
   device.session.save();
  },
 };
};
