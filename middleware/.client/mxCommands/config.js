module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: ``,
  help: [
   `Opens the config file using local edit.`,
  ],
  action: function({ device, middleware }) {
   middleware.localEdit({ filePath: exports.configFilePath });
  },
 };
};
