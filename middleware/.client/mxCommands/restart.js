module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `["force" | "hard"]`,
  help: [
   `This command restarts ${exports.title()} while preserving existing connections.`,
   `If the "hard" argument is used, then all connections will be terminated.`,
   `A hard restart is likely needed when updating to a minor or major release.`,
   `The force argument lets you force a restart even if a restart is already in progress. This is not recommended unless a restart process is stuck.`,
   `The force and hard arguments can be combined. Example: mx restart force hard`,
  ],
  action: async function({ device, args }) {
   const flags = args.reduce((flags, arg) => {
    const lcArg = arg.toLowerCase();
    if (lcArg) {
     if ('force'.startsWith(lcArg)) flags.force = true;
     if ('hard'.startsWith(lcArg)) flags.hard = true;
    }
    return flags;
   }, {});
   const flagsString = Object.keys(flags).sort().join(', ');
   device.tell(`Restarting${flagsString ? ` (${flagsString})` : ''} ...`);
   exports.log(`${device.title()} initiated a restart. Flags: ${flagsString || 'none'}.`);
   const success = await exports.restart(flags);
   if (success) device.tell(`Done.`);
   else if (!flags.hard) device.tell(`You might need to do a hard restart by typing: mx r hard`);
  },
 };
};
