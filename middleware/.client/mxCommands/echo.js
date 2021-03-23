module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  sessionRequired: false,
  syntax: `[text]`,
  commands: ['echo'],
  help: [
   `Echoes back the text to you.`,
  ],
  action: function({ device, middleware, argstr }) {
   if (argstr) device.tell(argstr);
   else (async () => device.tell(await middleware.prompt({ multiline: true, abortOnBlank: true, message: `Enter the text that you want echoed back to you:` })))();
  },
 };
};
