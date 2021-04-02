module.exports = async (main, { force } = {}) => {
 const exports = main.exports;

 exports.log(`Shutting down ${exports.title()}...`);

 if (force) process.exit();
 else {
  exports.events.emitBinaryState('ready', 'notReady');

  for (let directoryWatcher of exports.directoryWatchers.values()) directoryWatcher.close();
  for (let listener of exports.listeners.keys()) listener.close();
  for (let device of exports.devices.keys()) device.close();
  for (let session of exports.sessions.values()) session.close();
  for (let logger of exports.loggers.values()) logger.close();
  for (let db of exports.databases.values()) {
   await db.store();
   db.close();
  }
 }
};
