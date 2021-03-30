// This is the main entrypoint for MUDMixer.
// It is the only file that will not be reloaded when restarting MUDMixer from within the application.
//
// Note that if you import this module, then you'll need to manually start it by invoking start(), like this:
//   const mx = require('MUDMixer');
//   mx.start();

// Declarations.
exports.launchTime = new Date();
exports.cmd = {};
exports.config = {};
exports.defaultConfig = {};
exports.devices = new Map();
exports.clientsCount = 0;
exports.serversCount = 0;
exports.initCount = 0;
exports.journal = [];
exports.listeners = new Map();
exports.listenersCount = 0;
exports.log = console.log;
exports.loggers = new Map();
exports.sessions = new Map();
exports.directoryWatchers = new Map();
exports.package = {};
exports.utils = {};

// Process hooks.
process.on('uncaughtException', (error, origin) => {
 if (error && error instanceof Error) exports.log(origin || 'Uncaught', error);
});
process.on('unhandledRejection', (reason, promise) => {
 if (reason && reason instanceof Error) exports.log('Unhandled rejection', promise, 'reason', reason);
});

// A basic error handler function, intended to catch startup errors when running in headless mode.
const startupErrorHandler = reason => {
 if (require.main === module && !exports.cmd.q && exports.utils.msgBox) {
  let message;
  if (typeof reason === 'string') message = reason;
  else if (reason instanceof Error) message = reason.message;
  exports.utils.msgBox(`Could not start.${message ? ` Reason: ${message}` : ''}`);
 }
 throw reason;
};

// Initializing the application.
exports.initPromise = require('./initialize.js')(module).then(() => {
 exports.log(`${exports.title()} finished loading in ${exports.utils.formatThousands(Date.now() - exports.launchTime)} ms.`);
 // Auto start if the application was loaded directly (i.e. not through an import).
 if (require.main === module) {
  exports.start().then(() => {
   if (!exports.cmd.q) exports.utils.msgBox(`Started ${exports.title(true)}.`);
  }).catch(startupErrorHandler);
 }
}).catch(startupErrorHandler);
