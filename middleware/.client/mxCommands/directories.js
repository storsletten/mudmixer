module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: ``,
  help: [
   `Shows paths to ${exports.title()} directories.`,
  ],
  action: function({ device }) {
   const title = exports.title();
   device.tell(`- Application directory: ${exports.utils.formatPath(exports.packagePath)}`);
   device.tell(`- Data directory: ${exports.utils.formatPath(exports.dataPath())}`);
   device.tell();
   device.tell(`The application directory is where the ${title} source code was loaded from.`);
   device.tell(`The data directory is where your personal ${title} files live, such as logs, sessions, posts, configuration, and more.`);
  },
 };
};
