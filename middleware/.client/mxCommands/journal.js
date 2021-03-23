module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: ``,
  commands: ['mxj'],
  aliases: ['j'],
  help: [
   `Shows the most recent console log messages.`,
  ],
  action: function({ device }) {
   if (exports.journal.length === 0) return device.tell(`The console log journal is empty.`);
   for (let ent of exports.journal) {
    device.tell(`${exports.utils.formatTime(ent.time)}.${String(ent.time.getMilliseconds()).padEnd(3, ' ')} ${exports.utils.formatConsoleLogArgs(...ent.args)}`);
   }
  },
 };
};
