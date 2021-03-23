const fs = require('fs');
const path = require('path');

module.exports = main => {
 const exports = main.exports;

 const exists = (path, mode = fs.constants.F_OK) => fs.promises.access(path, mode).then(() => true).catch(() => false);

 const createWriteStream = (...args) => {
  const stream = fs.createWriteStream(...args);
  const events = new exports.utils.Events(stream);
  return new Promise((resolve, reject) => {
   if (stream.destroyed) reject(new Error(`The stream was destroyed from the start.`));
   else {
    events.on('error', (error) => {
     reject(error);
     stream.close();
    });
    events.on('close', () => reject(new Error(`The stream was closed before it could be opened.`)));
    events.on('open', () => resolve(stream));
   }
  }).finally(() => {
   events.close();
  });
 };

 const copyDirRecursively = async (source, destination, options = {}) => {
  const resolvedSource = path.resolve(source);
  const resolvedDestination = path.resolve(destination);
  const dirEnts = await fs.promises.readdir(resolvedSource, { withFileTypes: true });
  const dirCreated = await fs.promises.mkdir(resolvedDestination, { recursive: true });
  const created = [];
  const files = [];
  const directories = [];
  dirEnts.forEach(dirEnt => {
   (dirEnt.isDirectory() ? directories : files).push({
    name: dirEnt.name,
    source: path.join(resolvedSource, dirEnt.name),
    destination: path.join(resolvedDestination, dirEnt.name),
   });
  });
  if (dirCreated) created.push({ name: path.basename(resolvedDestination), source: resolvedSource, destination: resolvedDestination, isDirectory: true });
  if (directories.length > 0) (await Promise.all(directories.map(dir => copyDirRecursively(dir.source, dir.destination, options)))).forEach(ret => ret.length > 0 && created.push(...ret));
  const filesToCopy = ((options.overwrite || files.length === 0)
   ? files
   : (await Promise.allSettled(files.map(file => fs.promises.access(file.destination, fs.constants.F_OK)))).map((outcome, i) => outcome.status !== 'fulfilled' && files[i]).filter(v => v)
  );
  if (filesToCopy.length > 0) {
   await Promise.all(filesToCopy.map(file => fs.promises.copyFile(file.source, file.destination)));
   created.push(...filesToCopy);
  }
  return created;
 };

 return {
  exists,
  createWriteStream,
  copyDirRecursively,
 };
};
