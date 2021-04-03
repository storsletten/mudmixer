module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `[search term]`,
  commands: [`${exports.config.mxCommand || 'mx'}fr`],
  aliases: ['fr', 'findregexp', 'find-regexp', 'rf', 'rfind', 'regexpfind'],
  help: [
   `Searches the currently selected log directory for files with contents that match a regular expression.`,
   `Use the MX LS command to select a directory.`,
   `Search is performed in descending order, from newest to oldest.`,
  ],
  action: function({ device, middleware, argstr }) {
   const loggerName = device.getCurrentLoggerName() || 'default';
   if (!argstr) {
    if (device.currentLogSearchPromise) {
     device.currentLogSearchPromise = undefined;
     setTimeout(() => device.tell(`Search canceled.`), 50);
    }
    else device.tell(`What would you like to find in the ${loggerName} log directory?`);
   }
   else exports.searchLogDirectory({ device, middleware, loggerName, regexpSearch: new RegExp(argstr, 'i'), searchType: 'Regexp' });
  },
 };
};
