module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  sessionRequired: false,
  syntax: ``,
  commands: ['mxq'],
  aliases: ['q', 'exit'],
  help: [
   `This command terminates your connection to ${exports.title()}.`,
  ],
  action: function({ device }) {
   device.tell(`Goodbye.`);
   device.close('quitCommand');
  },
 };
};
