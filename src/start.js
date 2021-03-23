module.exports = async (main) => {
 const exports = main.exports;
 const config = exports.config;

 exports.log(`Starting...`);

 if (Array.isArray(config.listeners) && config.listeners.length > 0) {
  await exports.createListeners({ optionsArray: config.listeners, muteStartupErrors: true });
  if (exports.listeners.size === 0) throw new Error(`Couldn't start listening for incoming connections.`);
 }
 else throw new Error(`No listeners configured.`);

 await exports.loadSessions();

 exports.startTime = new Date();
 exports.log(`Ready.`);
 exports.events.emitBinaryState('ready');
};
