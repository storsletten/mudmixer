const fs = require('fs');
const path = require('path');

module.exports = main => {
 const exports = main.exports;

 exports.getMiddlewareDirectories = () => ([
  path.join(exports.packagePath, 'middleware'),
  exports.dataPath('middleware'),
 ]);

 exports.getMiddlewarePackagePath = async (name) => {
  const directories = exports.getMiddlewareDirectories().reverse();
  for (let directory of directories) {
   const packagePath = path.join(directory, name);
   if (await exports.utils.fs.exists(packagePath)) return packagePath;
  }
 };

 exports.getMiddlewarePackages = async () => {
  const packages = new Map();
  // The keys will be the package names (directory names).
  // As a result, middleware in the data directory will override middleware in the package directory if they have the same name.
  const directories = exports.getMiddlewareDirectories();
  (await Promise.allSettled(directories.map(
   dir => fs.promises.readdir(dir, { withFileTypes: true })
  ))).forEach((outcome, i) => {
   if (outcome.status === 'fulfilled') {
    const directory = directories[i];
    outcome.value.forEach(dirEnt => {
     if (dirEnt.isDirectory()) packages.set(exports.utils.titlify(dirEnt.name) || dirEnt.name, path.join(directory, dirEnt.name));
    });
   }
  });
  return packages;
 };
};
