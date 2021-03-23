const fs = require('fs');
const path = require('path');

module.exports = async (main) => {
 const exports = main.exports;
 const config = exports.config;
 const defaultConfig = exports.defaultConfig;

 exports.configFileName = 'config.json';
 exports.configFilePath = exports.dataPath(exports.configFileName);

 // Default configuration.
 const currentDefaultConfig = {
  textEditor: 'notepad', // A path to an executable that will be used with local edit.
  maxJournalSize: 50, // The maximum number of entries in exports.journal before it starts removing the oldest entry.
  defaultLogger: {
   name: '', // The logger name that will be used if no logger name is specified when using MX CL.
   filterANSIEscapeSequences: true, // Removes ANSI color codes and other ANSI sequences before writing to log file.
   filterOOB: true, // Skips writing messages that start with #$#
   includeTimestamps: true, // Appends a timestamp to the first message of every new second.
   milliseconds: false, // Includes milliseconds in the timestamps. If this is true, then a timestamp is appended to the first message of every millisecond.
  },
  loggers: [], // An array of objects where the name property determines which logger (directory name) that the properties apply to. See defaultLogger above for possible properties and values.
  listeners: [
   // An array of objects. Each object will be fed directly to the listen method of net.Server instances.
   { port: 7788, address: 'localhost' },
  ],
 };

 Object.keys(defaultConfig).forEach(key => (!(key in currentDefaultConfig)) && delete defaultConfig[key]);
 Object.assign(defaultConfig, currentDefaultConfig);

 exports.readConfig = async (filePath = exports.configFilePath, config = exports.config) => {
  // Returns the read data (string) on success, undefined on failure.
  filePath = path.resolve(filePath);
  const baseName = path.basename(filePath);
  try {
   const data = await fs.promises.readFile(filePath, { encoding: 'binary' });
   const parsedData = JSON.parse(data);
   if (!exports.utils.isRegularObject(parsedData)) throw new Error(`The data is not a regular object.`);
   exports.utils.pruneRegularObject(config, parsedData, { fix: true });
   exports.utils.mergeRegularObject(config, parsedData, { overwrite: true });
   exports.log(`Config ${filePath === exports.configFilePath ? 'file loaded' : `loaded from file ${exports.utils.formatPath(filePath)}`} (${exports.utils.formatThousands(Buffer.from(data).length)} Bytes read).`);
   return data;
  }
  catch (error) { exports.log(`Couldn't read config file ${exports.utils.formatPath(filePath)}.`, error); }
 };

 exports.writeConfig = async (filePath = exports.configFilePath, config = exports.config) => {
  // Returns the saved data (string) on success, undefined on failure.
  filePath = path.resolve(filePath);
  const dirName = path.dirname(filePath);
  const baseName = path.basename(filePath);
  const data = JSON.stringify(config, null, 1);
  const watcher = exports.directoryWatchers.get(dirName);
  const fileIgnored = watcher && watcher.ignoreFile({ name: baseName });
  try {
   await fs.promises.writeFile(filePath, data, { encoding: 'binary' });
   exports.log(`Saved config file${filePath === exports.configFilePath ? '' : ` to ${exports.utils.formatPath(filePath)}`} (${exports.utils.formatThousands(data.length)} Bytes written).`);
   return data;
  }
  catch (error) { exports.log(`Couldn't write config file ${exports.utils.formatPath(filePath)}.`, error); }
  finally { if (fileIgnored) watcher.unignoreFile({ name: baseName }); }
 };

 exports.tidyConfig = async (filePath = exports.configFilePath, config = exports.config, defaultConfig = exports.defaultConfig) => {
  // If changes are made to config, this function returns an object holding data, pruned, and merged.
  // If no tidying is needed, this function returns undefined.
  const pruned = exports.utils.pruneRegularObject(config, defaultConfig, { fix: true });
  if (pruned.length > 0) exports.log(`Pruned config:`, pruned.sort());
  const merged = exports.utils.mergeRegularObject(config, defaultConfig, { overwrite: false });
  if (merged.length > 0) exports.log(`Copied default config into config:`, merged.sort());
  if (pruned.length > 0 || merged.length > 0) {
   const data = await exports.writeConfig(filePath, config);
   return { data, pruned, merged };
  }
 };

 exports.loadConfig = async (...args) => {
  await exports.readConfig(...args);
  await exports.tidyConfig(...args);
 };

 await exports.loadConfig();

 const watcher = await exports.utils.watchDirectory(path.dirname(exports.configFilePath));
 await watcher.watchFile({
  name: exports.configFileName,
  callback: ({ eventType }) => {
   if (eventType !== 'delete') exports.loadConfig();
  },
 });
};
