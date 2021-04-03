module.exports = async (main, middleware) => {
 const exports = main.exports;
 const device = middleware.device;

 const loadMore = async () => {
  require('./mcp.js')(main, middleware);
  require('./mcpClientInfo.js')(main, middleware);
  require('./mcpNegotiate.js')(main, middleware);
  require('./mcpPing.js')(main, middleware);
  require('./mcpSimpleEdit.js')(main, middleware);
  await require('./mxCommands/index.js')(main, middleware);
 };

 if (device.session) await loadMore();
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

    // Loading more stuff after a successful login.
    await loadMore();

    // Register soundpack (if any).
    if (device.soundpack) device.getActiveServers().forEach(server => server.tellServer(`#$#register_soundpack ${device.soundpack.name} | ${device.soundpack.version}`));

    device.tell(`#$#mcp version: 2.1 to: 2.1`);
    device.tell(`Type MX HELP if you need help.`);
   }
  })();
 }
};
