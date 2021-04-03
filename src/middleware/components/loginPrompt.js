module.exports = main => {
 const exports = main.exports;

 class LoginPrompt extends exports.Action {
  constructor(options) {
   super(options);
   const { device, middleware, message, abortable, maxAttempts } = options;
   if (this.resolveValueOnly === undefined) this.resolveValueOnly = true;
   this.abortable = abortable;
   this.attempts = 0;
   this.maxAttempts = (typeof maxAttempts === 'number' ? maxAttempts : (abortable ? 0 : 10));
   this.message = message;
   if (this.message) device.tell(this.message);
  }

  execute(args) {
   const { device, middleware, line } = args;
   if (this.abortable && line.trim().toLowerCase() === '@abort') {
    device.tell(middleware.messages.commandAborted);
    this.reject({ ...args, reason: 'userAborted' });
   }
   else {
    const match = line.match(/^\s*(?:connect\s+)?(.+?)\s*$/i);
    if (match) {
     const sessionName = match[1];
     this.attempts++;
     if (exports.hasSessions()) {
      const session = exports.getSession(sessionName, false);
      if (session) {
       if (device.session === session) {
        device.tell(`You are already logged in to that session.`);
        this.reject({ ...args, reason: 'alreadyLoggedIn' });
       }
       else {
        device.tell(`Logged in!`);
        if (device.session) device.unsetSession();
        session.addClient(device);
        this.resolve(session);
       }
      }
      else {
       const announcement = `Failed login attempt by ${device.title()} (${exports.utils.formatIPAddress(device.socket && device.socket.remoteAddress)}).`;
       exports.log(`Failed login by ${device.title()}. Session does not exist:`, sessionName);
       exports.devices.forEach((p, d) => (d.session && d.isClient() && d.tell(announcement)));
       if (this.attempts === this.maxAttempts) {
        device.tell(`*** Max login attempts ***`);
        this.reject({ ...args, reason: 'maxLoginAttempts' });
        if (!device.session) device.close('maxLoginAttempts');
       }
       else device.tell(`There is no session named ${sessionName}`);
      }
     }
     else {
      const invalidCharacters = exports.utils.invalidFileName(sessionName);
      if (invalidCharacters) device.tell(`The session ID can't contain ${exports.utils.englishList(invalidCharacters, { and: 'or' })}.`);
      else {
       const session = new exports.Session({ data: {}, name: sessionName, filePath: exports.dataPath('sessions', `${sessionName}.json`) });
       session.addClient(device);
       device.tell(`First session created: ${sessionName}`);
       this.resolve(session);
      }
     }
    }
   }
  }
 }

 exports.LoginPrompt = LoginPrompt;
};
