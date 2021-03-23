module.exports = (main, middleware) => {
 const exports = main.exports;

 middleware.setCommand('connect', ({ device, argstr, options }) => {
  const maxAttempts = 10;
  if (device.session) {
   // If session is already set, then we simply let the connect command pass through.
   options.clientsOnly = undefined;
   return;
  }
  const sessionName = argstr.trim();
  if (!sessionName) return device.tell(`Connect to which session?`);
  if (device.sessionConnectAttempts) device.sessionConnectAttempts++;
  else device.sessionConnectAttempts = 1;
  if (exports.hasSessions()) {
   const session = exports.getSession(sessionName, false);
   if (!session) {
    if (device.sessionConnectAttempts >= maxAttempts) {
     device.tell(`That session could not be found, and the max number of connect attempts has been reached. Goodbye.`);
     device.close('maxSessionConnectAttempts');
    }
    else device.tell(`That session does not exist.`);
   }
   else {
    device.tell(`Connected to session ${JSON.stringify(session.name)}.`);
    session.addClient(device);
   }
  }
  else {
   const invalidCharacters = exports.utils.invalidFileName(sessionName);
   if (invalidCharacters) return device.tell(`The session ID can't contain ${exports.utils.englishList(invalidCharacters, { and: 'or' })}.`);
   const session = new exports.Session({ data: {}, name: sessionName, filePath: exports.dataPath('sessions', `${sessionName}.json`) });
   session.addClient(device);
   device.tell(`Session created.`);
  }
 });
};
