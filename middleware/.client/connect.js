module.exports = async (main, middleware) => {
 const exports = main.exports;
 const device = middleware.device;

 if (device.session) await require('./mxCommands/index.js')(main, middleware);
 else {
  (async () => {
   if (!device.destroyed && !device.session) {
    const loginPrompt = middleware.setInterceptor(new exports.LoginPrompt({ device, middleware })).action;
    device.timers.setTimeout('loginPrompt', 500, () => {
     // Delaying this prompt in case there are clients / soundpacks that need a little bit of time to load scripts that depend on these messages.
     // The Miriani Soundpack for VIP Mud is an example of this.
     // It also gives clients a chance to login without ever having to see the prompt, in case someone wants that.
     if (loginPrompt.status === 'pending' && loginPrompt.attempts === 0) {
      device.tell([
       '',
       `  ${exports.title()} Login`,
       `Session ID:`,
      ]);
     }
    });
    const session = await loginPrompt.promise;
    // Loading MX commands after a successful login.
    await require('./mxCommands/index.js')(main, middleware);
    device.tell(`Type MX HELP if you need help.`);
   }
  })();
 }
};
