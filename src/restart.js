module.exports = async (main, { force, hard } = {}) => {
 const exports = main.exports;

 exports.log(`Restarting...`);

 if (hard) {
  await require('./shutdown.js')(main);
  await require('./start.js')(main);
 }
 else {
  exports.events.emitBinaryState('ready', 'notReady');

  for (let directoryWatcher of exports.directoryWatchers.values()) directoryWatcher.close();

  await (exports.initPromise = require('./initialize.js')(main));

  if (Array.isArray(exports.config.listeners)) await exports.syncListeners(exports.config.listeners);

  for (let listener of exports.listeners.keys()) listener.update();
  for (let logger of exports.loggers.values()) logger.update();
  for (let session of exports.sessions.values()) session.update();
  for (let device of exports.devices.keys()) {
   device.update();
   if (device.middleware) device.middleware.update();
  }
  for (let device of exports.devices.keys()) {
   // Awaiting reloads in a separate loop to ensure all device instances are updated first.
   if (device.middleware) await device.middleware.reload();
  }
 }

 await exports.loadSessions();

 exports.log(`Restart completed in ${exports.utils.formatThousands(Date.now() - exports.restartTime)} ms.`);
 exports.events.emitBinaryState('ready');
};
