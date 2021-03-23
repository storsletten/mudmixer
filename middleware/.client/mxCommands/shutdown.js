module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `["force"]`,
  help: [
   `This command shuts down ${exports.title()}.`,
   `The force argument lets you force a shutdown even if a shutdown/restart process is already ongoing. Forcing shutdown is not recommended unless something is stuck.`,
  ],
  action: function({ device, args }) {
   const flags = args.reduce((flags, arg) => {
    const lcArg = arg.toLowerCase();
    if (lcArg) {
     if ('force'.startsWith(lcArg)) flags.force = true;
    }
    return flags;
   }, {});
   const flagsString = Object.keys(flags).sort().join(', ');
   device.tell(`Shutting down${flagsString ? ` (${flagsString})` : ''} ...`);
   exports.log(`${device.title()} initiated shutdown. Flags: ${flagsString || 'none'}.`);
   exports.shutdown(flags);
  },
 };
};
