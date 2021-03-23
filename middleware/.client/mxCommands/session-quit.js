module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: ``,
  aliases: ['sq', 'squit', 'quit-session'],
  help: [
   `This command disconnects you from the current session.`,
  ],
  action: function({ device, argstr }) {
   const session = device.session;
   device.unsetSession();
   device.tell(`You are now disconnected from ${session.title()}.`);
   exports.log(`${device.title()} logged out of ${session.title()}.`);
  },
 };
};
