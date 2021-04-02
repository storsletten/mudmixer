const fs = require('fs');
const path = require('path');

module.exports = main => {
 const exports = main.exports;

 exports.getDatabase = (name) => {
  const lcName = name.toLowerCase();
  const existingDatabase = exports.databases.get(lcName);
  if (existingDatabase) return existingDatabase;
  else return new exports.Database({ name });
 };

 exports.getDatabaseFileNames = async () => {
  const databases = new Map();
  const directories = [exports.dataPath('databases')];
  (await Promise.allSettled(directories.map(
   dir => fs.promises.readdir(dir, { withFileTypes: true })
  ))).forEach((outcome, i) => {
   if (outcome.status === 'fulfilled') {
    const directory = directories[i];
    outcome.value.forEach(dirEnt => {
     if (!dirEnt.isDirectory() && dirEnt.name.length > 5 && dirEnt.name.toLowerCase().endsWith('.json')) {
      const name = dirEnt.name.slice(0, -5);
      databases.set(exports.utils.titlify(name) || name, path.join(directory, dirEnt.name));
     }
    });
   }
  });
  return databases;
 };
};
