module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  sessionRequired: false,
  syntax: ``,
  commands: ['mxd'],
  aliases: ['d'],
  help: [
   `Shows your computer's current date.`,
  ],
  action: function({ device }) {
   device.tell(exports.utils.formatDate());
  },
 };
};
