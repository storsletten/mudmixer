module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: ``,
  help: [
   `Shows uptime information.`,
  ],
  action: function({ device }) {
   const now = new Date();
   device.tell(`${exports.title()} has been up for ${exports.utils.formatTimeDiff(exports.launchTime, now)} (since ${exports.utils.formatDateAndTime(exports.launchTime)}).`);
   device.tell(`Your client has been connected for ${exports.utils.formatTimeDiff(device.creationTime, now)} (since ${exports.utils.formatDateAndTime(device.creationTime)}).`);
  },
 };
};
