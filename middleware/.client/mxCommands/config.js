module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `option`,
  commands: [`${exports.config.mxCommand || ''}conf`],
  aliases: ['conf', 'config'],
  help: [
   `This command changes global MX options in config.json`,
  ],
  action: async function({ device, middleware, argstr }) {
   const template = {
    textEditor: {
     name: 'Text Editor',
     type: 'string',
    },
    maxJournalSize: {
     name: 'Max Journal Size',
     type: 'number',
     min: 0,
    },
    defaultLogger: {
     name: 'Default Logger Options',
     type: 'object',
     template: {
      filterANSIEscapeSequences: {
       name: 'Filter ANSI Escape Sequences',
       type: 'boolean',
      },
      filterOOB: {
       name: 'Filter Out-Of-Band Messages',
       type: 'boolean',
      },
      includeTimestamps: {
       name: 'Append Timestamps',
       type: 'boolean',
      },
      milliseconds: {
       name: 'Include Milliseconds in Timestamps',
       type: 'boolean',
      },
     },
    },
    mxCommand: {
     name: 'MX Command Name',
     type: 'string',
     description: [
      `This option sets the name of the MX command.`,
      `You'll need to reconnect or perform a hard restart before changes to this option have any effect.`,
     ],
     abortOnBlank: true,
     validate: value => {
      if (value.includes(' ')) return `The command cannot include spaces.`;
     },
    },
   };
   middleware.optionsMenu({
    device,
    template,
    argstr,
    options: exports.config,
    saveCallback: exports.writeConfig,
   });
  },
 };
};
