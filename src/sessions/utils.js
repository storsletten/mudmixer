const fs = require('fs');
const net = require('net');
const path = require('path');

module.exports = main => {
 const exports = main.exports;

 exports.defaultServerOptions = {
  name: undefined,
  host: undefined,
  port: undefined,
  tls: undefined,
  loginCommand: undefined,
  disabled: false,
  reconnect: true,
  reconnectAggressively: false,
  reconnectInterval: 3000,
  bufferTTL: 250,
  acceptLocalEdit: true,
  ascii: true,
  middleware: [],
  readLoggers: [''],
  writeLoggers: [],
 };

 exports.knownHosts = new Map([
  [/(^|\.)toastsoft\.net:\d+$/, {
   name: 'miriani',
   middleware: ['miriani'],
   bufferTTL: 0,
   readLoggers: ['miriani'],
  }],
 ]);

 exports.getSession = (sessionName, partialMatch = true) => {
  const lcSessionName = sessionName.trim().toLowerCase();
  const session = exports.sessions.get(lcSessionName);
  if (session) return session;
  else if (lcSessionName && partialMatch) {
   for (let [lcName, session] of exports.sessions) {
    if (lcName.startsWith(lcSessionName)) return session;
   }
  }
 };

 exports.getSessionFileNames = async () => {
  const sessions = new Map();
  const directories = [exports.dataPath('sessions')];
  (await Promise.allSettled(directories.map(
   dir => fs.promises.readdir(dir, { withFileTypes: true })
  ))).forEach((outcome, i) => {
   if (outcome.status === 'fulfilled') {
    const directory = directories[i];
    outcome.value.forEach(dirEnt => {
     if (!dirEnt.isDirectory() && dirEnt.name.length > 5 && dirEnt.name.toLowerCase().endsWith('.json')) {
      const name = dirEnt.name.slice(0, -5);
      sessions.set(exports.utils.titlify(name) || name, path.join(directory, dirEnt.name));
     }
    });
   }
  });
  return sessions;
 };

 exports.hasSessions = () => exports.sessions.size > 0;

 exports.parseServerString = str => {
  const m = str.match(/^\s*([^\s]+?)(?:\s+|:)(s|ssl|t|tls)?(\d{1,5})(?:\s+(.+?)?\s*)?$/is);
  if (m) {
   const port = parseInt(m[3]);
   if (isFinite(port) && port > 0 && port < 65536) {
    const lookupstr = `${m[1]}:${m[3]}`;
    const options = {
     ...JSON.parse(JSON.stringify(exports.defaultServerOptions)),
     host: m[1],
     port,
     tls: Boolean(m[2]),
     loginCommand: m[4],
    };
    for (let [re, opt] of exports.knownHosts) {
     if (lookupstr.match(re)) {
      Object.assign(options, JSON.parse(JSON.stringify(opt)));
      break;
     }
    }
    if (!options.name && net.isIP(options.host) === 0) {
     const domainComponents = options.host.split('.');
     options.name = domainComponents[Math.max(0, domainComponents.length - 2)];
    }
    options.name = exports.utils.sanitizeFileName(options.name || options.host).trim().toLowerCase() || 'unnamed';
    return options;
   }
  }
 };

 exports.loadSession = async ({ sessionName, filePath }) => {
  try {
   sessionName = sessionName.trim();
   if (!sessionName) throw new Error(`Missing sessionName.`);
   exports.log(`Loading session: ${sessionName}`);
   const dataString = await fs.promises.readFile(filePath, { encoding: 'binary' });
   const session = exports.getSession(sessionName, false) || (new exports.Session({ name: sessionName, filePath }));
   const data = JSON.parse(dataString);
   if (!exports.utils.isRegularObject(data)) throw new Error(`Failed to load session ${sessionName}:`, `The session file is not formatted as a regular object.`);
   await session.updateData(data);
   return session;
  }
  catch (error) { exports.log(`Failed to load session ${JSON.stringify(sessionName)}:`, error); }
 };

 exports.loadSessions = async () => {
  const sessionFileNames = await exports.getSessionFileNames();
  const directoryWatchers = new Set();
  for (let [sessionName, filePath] of sessionFileNames) {
   const dirName = path.dirname(filePath);
   const baseName = path.basename(filePath);
   const watcher = await exports.utils.watchDirectory(dirName);
   directoryWatchers.add(watcher);
   await exports.loadSession({ sessionName, filePath });
   await watcher.watchFile({ name: baseName, callback: ({ eventType, fileName }) => exports.handleSessionFileEvent({ watcher, sessionName, eventType, filePath, fileName, dirName, baseName }) });
  }
  for (let watcher of directoryWatchers) watcher.addCallback({ callback: ({ eventType, fileName }) => exports.handleSessionDirectoryEvent({ watcher, eventType, fileName, dirName: watcher.path, filePath: path.join(watcher.path, fileName), baseName: path.basename(fileName || '') }) });
 };

 exports.renameSessionFile = async (oldSessionName, newSessionName) => {
  const directories = [exports.dataPath('sessions')];
  const errors = [];
  for (let dirName of directories) {
   const oldFilePath = path.join(dirName, `${oldSessionName}.json`);
   const newFilePath = path.join(dirName, `${newSessionName}.json`);
   try {
    await fs.promises.rename(oldFilePath, newFilePath);
    return true;
   }
   catch (error) { errors.push(error); }
  }
  exports.log(`Failed to rename session file:`, ...errors);
  return false;
 };

 exports.removeSessionFile = async (sessionName) => {
  const directories = [exports.dataPath('sessions')];
  const errors = [];
  for (let dirName of directories) {
   const filePath = path.join(dirName, `${sessionName}.json`);
   try {
    await fs.promises.unlink(filePath);
    return true;
   }
   catch (error) { errors.push(error); }
  }
  exports.log(`Failed to remove session file:`, ...errors);
  return false;
 };

 exports.handleSessionFileEvent = ({ watcher, eventType, filePath, sessionName }) => {
  if (eventType === 'delete') {
   const session = exports.getSession(sessionName, false);
   if (session) session.close();
  }
  else exports.loadSession({ sessionName, filePath });
 };
 exports.handleSessionDirectoryEvent = ({ watcher, eventType, baseName, filePath }) => {
  if (eventType === 'file' && baseName.length > 5 && baseName.toLowerCase().endsWith('.json')) {
   const sessionName = exports.utils.titlify(baseName.slice(0, -5)) || baseName.slice(0, -5);
   exports.handleSessionFileEvent({ watcher, sessionName, eventType, fileName, baseName, filePath });
   watcher.watchFile({ name: baseName, callback: ({ eventType, fileName }) => exports.handleSessionFileEvent({ watcher, sessionName, eventType, fileName, baseName, filePath }) });
  }
 };
};
