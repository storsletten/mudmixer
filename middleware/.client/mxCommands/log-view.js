const fs = require('fs');
const path = require('path');

module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `[date yyyy-mm-dd | number of days ago] [name]`,
  commands: ['mxl'],
  aliases: ['l', 'log', 'lv', 'lview', 'view-log'],
  help: [
   `Opens a log file using local edit.`,
  ],
  action: async function({ device, argstr }) {
   const args = argstr.split(/\s+(.+)/s);
   const chosenDate = new Date();
   if (args[0].trim() === '') args.shift();
   if (args.length > 0) {
    const dateSelector = args[0];
    if (dateSelector.match(/^\d{1,10}$/)) {
     chosenDate.setDate(chosenDate.getDate() - parseInt(dateSelector));
     args.shift();
    }
    else {
     const parsedTime = Date.parse(dateSelector);
     if (!isNaN(parsedTime)) {
      chosenDate.setTime(parsedTime);
      args.shift();
     }
    }
   }
   const logsDir = exports.dataPath('logs');
   const loggerNameSearch = exports.utils.sanitizeFileName((args.length > 0 && args[0].trim()) || device.getCurrentLoggerName() || 'default');
   const lcLoggerNameSearch = loggerNameSearch.toLowerCase();
   const loggerName = ((await fs.promises.readdir(logsDir, { withFileTypes: true })).find(ent => ent.name.toLowerCase().startsWith(lcLoggerNameSearch)) || {}).name;
   if (loggerName === undefined) return device.tell(`There is no logs directory named ${JSON.stringify(loggerNameSearch)}.`);
   const logDir = path.join(logsDir, loggerName);
   const dirName = path.join(logDir, String(chosenDate.getFullYear()), String(chosenDate.getMonth() + 1));
   const lcBaseNamePrefix = exports.utils.englishOrdinalIndicator(chosenDate.getDate()).toLowerCase();
   const baseName = ((await fs.promises.readdir(dirName, { withFileTypes: true }).catch(() => [])).find(ent => {
    const lcBaseName = ent.name;
    return lcBaseName.startsWith(lcBaseNamePrefix) && lcBaseName.endsWith('.txt') && ent.isFile();
   }) || {}).name;
   if (baseName === undefined) device.tell(`The ${loggerName} log directory doesn't have an entry for ${exports.utils.formatDateWordly(chosenDate)}.`);
   else {
    try {
     await exports.utils.localEdit({ device, dirName, baseName });
     device.tell(`Opening ${loggerName ? `${loggerName} ` : ''}log...`);
    }
    catch (error) {
     exports.log(`mx log error:`, error);
     device.tell(`Failed to open the log file with local edit.`);
    }
   }
  },
 };
};
