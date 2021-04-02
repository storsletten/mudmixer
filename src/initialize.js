const path = require('path');

module.exports = async (main) => {
 const exports = main.exports;
 exports.initCount++;
 exports.srcPath = __dirname;
 exports.packagePath = path.join(__dirname, '..');

 // Load package.
 Object.assign(exports.package, require(path.join(exports.packagePath, 'package.json')));

 // Load utilities.
 require('./utils/index.js')(main);

 // Title function.
 exports.title = includeVersion => {
  const name = exports.utils.titlify(exports.package.name);
  return includeVersion ? `${name} v${exports.package.version || '0'}` : name;
 };

 // Global events.
 if (exports.events) {
  exports.events.emitBinaryState('loadingComplete', 'reloading');
  exports.events.removeAllListeners();
 }
 else exports.events = new exports.utils.Events();

 // Global timers.
 if (exports.timers) exports.timers.clear();
 else exports.timers = new exports.utils.Timers();

 // The custom console log function.
 exports.log = (...args) => {
  // args can be anything that can be consumed by console.log.
  const time = new Date();
  const overflow = exports.journal.push({ time, args }) - (exports.config.maxJournalSize || 50);
  if (overflow > 0) exports.journal.splice(0, overflow);
  // Use formatDateAndTime if you want to include the date.
  console.log(`${exports.utils.formatTime(time)}.${String(time.getMilliseconds()).padEnd(3, ' ')}`, ...args);
  if (exports.devices.size > 0 && args.some(arg => arg instanceof Error)) {
   for (let device of exports.devices.keys()) {
    if (device.isClient()) device.tell(args.join(' '));
   }
  }
 };

 exports.onExit = (code) => {
  // This function must be synchronous.
  exports.databases.forEach(db => db.storeSync());
 };

 exports.log(`Loading ${exports.title(true)} from ${exports.utils.formatPath(exports.packagePath)} ...`);

 // Command-line arguments.
 require('./args.js')(main);

 // The data path function.
 // It returns the absolute path to the user data directory.
 // Optionally with a relative path appended.
 // If an absolute path is provided, then the user data path is ignored.
 exports.dataPath = (relativePath, ...extraPathComponents) => (
  path.resolve(
   path.isAbsolute(relativePath || '')
   ? path.join(relativePath, ...extraPathComponents)
   : path.join(exports.cmd.d, relativePath || '', ...extraPathComponents)
  )
 );

 exports.log(`User data directory is ${exports.utils.formatPath(exports.dataPath())}.`);

 // Function for copying the boilerplate to the chosen data directory.
 exports.copyBoilerplate = async (destination = exports.cmd.d) => {
  const resolvedDestination = path.join(path.resolve(destination), path.sep);
  try {
   const created = await exports.utils.fs.copyDirRecursively(path.join(__dirname, 'boilerplate'), resolvedDestination, { overwrite: false, excludedNames: ['.gitkeep'] });
   if (created.length > 0) exports.log(`Copied data directory boilerplate to ${exports.utils.formatPath(resolvedDestination)}:`, created.map(ent => exports.utils.formatPath(ent.destination.slice(resolvedDestination.length) + (ent.isDirectory ? path.sep : ''), { enclosingQuotes: false })).sort());
   return created;
  }
  catch (error) { exports.log(`Failed to copy boilerplate:`, error); }
 };

 // Copy boilerplate to user data directory.
 await exports.copyBoilerplate();

 // Load configuration.
 await require('./config.js')(main);

 // Start function.
 exports.start = async () => await (exports.startTime ? exports.restart() : require('./start.js')(main));

 // Restart function.
 exports.restart = async ({ force, hard } = {}) => {
  if (!force) {
   if (!exports.startTime) return await exports.start();
   else if (exports.restartTime) {
    exports.log(`A restart is already in progress.`);
    return false;
   }
   else if (exports.shutdownTime) {
    exports.log(`A shutdown is already in progress.`);
    return false;
   }
  }
  exports.restartTime = new Date();
  for (let mod in require.cache) {
   if (mod !== main.filename) delete require.cache[mod];
  }
  try { await require('./restart.js')(main, { force, hard }); return true; }
  catch (err) { exports.log(`Restart failed:`, err); return false; }
  finally { exports.restartTime = undefined; }
 };

 // Shutdown function.
 exports.shutdown = async ({ force } = {}) => {
  if (!force) {
   if (!exports.startTime) throw new Error(`${exports.title()} can't be shut down because it has not been started. Use exports.shutdown(true) if you wish to force a shutdown.`);
   else if (exports.restartTime) {
    exports.log(`A restart is already in progress.`);
    return false;
   }
   else if (exports.shutdownTime) {
    exports.log(`A shutdown is already in progress.`);
    return false;
   }
  }
  exports.shutdownTime = new Date();
  try { await require('./shutdown.js')(main, { force }); return true; }
  catch (err) { exports.log(`Shutdown failed:`, err); return false; }
  finally { exports.shutdownTime = undefined; }
 };

 // Function for loading a custom script.
 exports.loadCustomScript = async (fileName = 'custom.js') => {
  const filePath = exports.dataPath(fileName);
  exports.log(`Loading custom script ${exports.utils.formatPath(filePath, { relativeTo: exports.dataPath() })}.`);
  try { await require(filePath)(main); }
  catch (error) { exports.log(`Custom script error:`, error); }
 };

 // Load other scripts.
 await require('./middleware/index.js')(main);
 await require('./net/index.js')(main);
 await require('./sessions/index.js')(main);
 await require('./loggers/index.js')(main);
 await require('./databases/index.js')(main);

 // Load custom script.
 await exports.loadCustomScript();

 exports.events.emitBinaryState('loadingComplete');
};
