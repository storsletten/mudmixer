module.exports = main => {
 const exports = main.exports;

 exports.createListeners = ({ optionsArray, muteStartupErrors }) => {
  return Promise.allSettled(optionsArray.map(options => {
   const listener = new exports.Listener();
   listener.muteStartupErrors = muteStartupErrors;
   return listener.createSocket(options);
  }));
 };

 exports.syncListeners = async (optionsArray) => {
  // This function uses JSON.stringify and string comparisons to compare socketOptions.
  // Excluding listeners that have no socketOptions set.
  const optionsStrings = optionsArray.map(options => JSON.stringify(options));
  const stopped = [...exports.listeners.keys()].filter(listener => listener.socketOptionsString && optionsStrings.includes(listener.socketOptionsString) === false && (listener.close('sync') || true)).length;
  const outcomes = await exports.createListeners({ optionsArray, muteStartupErrors: true });
  const started = outcomes.filter(outcome => outcome.status === 'fulfilled').length;
  const existingOptionsStrings = [...exports.listeners.keys()].map(listener => listener.socketOptionsString).filter(str => str);
  const inSync = optionsStrings.length === existingOptionsStrings.length && optionsStrings.filter(str => existingOptionsStrings.includes(str)).length === optionsStrings.length;
  if (inSync) {
   if (started || stopped) exports.log(`Successfully synchronized listeners.`);
  }
  else exports.log(`Failed to synchronize listeners.`);
  return inSync;
 };
};
