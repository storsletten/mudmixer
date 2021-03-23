const fs = require('fs');

module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `[name]`,
  commands: ['mxls'],
  aliases: ['ls', 'lswitch', 'switch-log', 'lselect', 'select-log', 'log-select'],
  help: [
   `This command sets the current log directory to use with the other MX log commands.`,
  ],
  action: async function({ device, argstr }) {
   if (!argstr) device.tell(`The ${device.getCurrentLoggerName() || 'default'} log directory is currently selected.`);
   else {
    const logsDir = exports.dataPath('logs');
    const loggerNameSearch = exports.utils.sanitizeFileName(argstr);
    const lcLoggerNameSearch = loggerNameSearch.toLowerCase();
    const loggerName = ((await fs.promises.readdir(logsDir, { withFileTypes: true })).find(ent => ent.name.toLowerCase().startsWith(lcLoggerNameSearch)) || {}).name;
    if (loggerName === undefined) device.tell(`There is no logs directory named ${JSON.stringify(loggerNameSearch)}.`);
    else if (loggerName === (device.getCurrentLoggerName() || 'default')) device.tell(`The ${loggerName} log directory is already currently selected.`);
    else {
     device.currentLoggerName = loggerName;
     device.tell(`Switched to the ${loggerName} log directory.`);
    }
   }
  },
 };
};
