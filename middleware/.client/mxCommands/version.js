module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  sessionRequired: false,
  syntax: ``,
  aliases: ['v'],
  help: [
   `Shows version information.`,
  ],
  action: function({ device }) {
   device.tell(exports.title(true));
   device.tell(`NodeJS ${process.version || 'N/A'}`);
  },
 };
};
