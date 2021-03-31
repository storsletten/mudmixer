module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `[option name]`,
  commands: ['mxso'],
  aliases: ['so'],
  help: [
   `This command can be used to change options for the current session.`,
  ],
  action: function({ device, middleware, argstr }) {
   const template = {
    runInBackground: {
     name: 'Run in Background',
     type: 'boolean',
    },
    textEditor: {
     name: 'Text Editor',
     type: 'string',
    },
   };
   const session = device.session;
   middleware.optionsMenu({
    device,
    argstr,
    template,
    options: session.data.options,
    saveCallback: session.save.bind(session),
   });
  },
 };
};
