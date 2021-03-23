const os = require('os');
const path = require('path');

module.exports = async (main) => {
 const exports = main.exports;

 // Function for parsing command-line arguments.
 exports.parseCmdArgs = (args = process.argv.slice(2)) => {
  if (!Array.isArray(args)) throw new Error(`args must be an Array of strings.`);
  const start = args.length && (['--', '//'].includes(args[0]) ? 1 : 0);
  if (start >= args.length) return;
  const cmd = {};
  let lastSwitch = '';
  for (let i=start; i<args.length; i++) {
   if (typeof args[i] !== 'string') throw new Error(`args[${i}] is ${typeof args[i]}. String is expected.`);
   const isSwitch = Boolean(args[i]) && args[i][0] === '-';
   if (isSwitch) {
    lastSwitch = args[i].replace(/^--?/, '').toLowerCase();
    if (lastSwitch in exports.cmdAliases) lastSwitch = cmdAliases[lastSwitch];
   }
   const type = typeof ((lastSwitch in exports.cmd) ? exports.cmd : cmd)[lastSwitch];
   if (isSwitch && !(lastSwitch in cmd) && !(lastSwitch in exports.cmd)) exports.log(`Unknown command-line argument:`, args[i]);
   if (type === 'boolean') cmd[lastSwitch] = isSwitch || !['', 'off', 'false', 'disable', 'disabled'].includes(args[i].toLowerCase());
   else if (cmd[lastSwitch]) {
    if (!isSwitch) cmd[lastSwitch] = `${cmd[lastSwitch]} ${args[i]}`;
   }
   else cmd[lastSwitch] = isSwitch ? '' : args[i];
  }
  Object.assign(exports.cmd, cmd);
 };

 if (exports.initCount === 1) {
  // Command-line arguments and their initial values.
  // Only string and boolean values are supported at this time.
  // Make sure the keys are all lowercase.
  Object.assign(exports.cmd, {
   d: path.join(os.homedir(), os.platform() === 'win32' ? 'Documents' : '', ['darwin', 'win32'].includes(os.platform()) ? exports.title() : exports.package.name),
   q: require.main !== main,
  });

  // Command-line aliases.
  // Make sure they're all lowercase.
  exports.cmdAliases = {
   '': 'd',
   dir: 'd',
   directory: 'd',
   quiet: 'q',
  };
  
  // If the application is loaded directly (not imported) and command-line arguments have been passed, then we parse.
  if (require.main === main && process.argv.length > 2) exports.parseCmdArgs();
 }
};
