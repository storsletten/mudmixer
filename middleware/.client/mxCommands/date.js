module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  sessionRequired: false,
  syntax: ``,
  commands: [`${exports.config.mxCommand || 'mx'}d`],
  aliases: ['d'],
  help: [
   `Shows your computer's current date.`,
  ],
  action: function({ device }) {
   device.tell(exports.utils.formatDate());
  },
 };
};
