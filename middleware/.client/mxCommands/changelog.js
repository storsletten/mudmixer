module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: ``,
  help: [
   `Opens the changelog file using local edit.`,
  ],
  action: async function({ device }) {
   const baseName = 'CHANGELOG.txt';
   const dirName = exports.packagePath;
   try {
    await exports.utils.localEdit({ device, dirName, baseName });
    device.tell(`Opening the changelog...`);
   }
   catch (error) {
    exports.log(`mx changelog error:`, error);
    device.tell(`Failed to open the changelog with local edit.`);
   }
  },
 };
};
