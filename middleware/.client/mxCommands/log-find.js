module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `[search term]`,
  commands: [`${exports.config.mxCommand || 'mx'}f`],
  aliases: ['f', 'find', 'lf', 'lfind'],
  help: [
   `Searches the currently selected log directory for a file containing the search term.`,
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
   else {
    const regexpSearch = new RegExp(argstr.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&'), 'i');
    exports.searchLogDirectory({ device, middleware, loggerName, regexpSearch, searchType: 'Plaintext' });
   }
  },
 };
};
