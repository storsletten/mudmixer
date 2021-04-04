module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `[expression]`,
  commands: [`${exports.config.mxCommand || 'mx'}e`, `${exports.config.mxCommand || 'mx'}ev`],
  aliases: ['e'],
  help: [
   `Evaluates the expression as JavaScript code.`,
   `The following variables are available:`,
   `- mx (or exports): The main module exports.`,
   `- device (or me, client): Your current Device instance.`,
   `- middleware: Your current Middleware instance.`,
   `- session: Your current Session instance.`,
   `- activeServers: An array of servers that you are currently set to transmit to.`,
   `- server: The first item of the activeServers variable (if any).`,
   `- servers: A getter proxy for session.getServer(). Lists session.servers if no property is accessed.`,
  ],
  action: async function({ device, command, commands, args, argstr, middleware }) {
   if (!argstr) {
    const { lines } = await middleware.prompt({ multiline: true, message: `Enter the JavaScript code that you wish to execute:` });
    if (lines.length === 0) return;
    argstr = lines.join("\n");
   }
   const mx = exports;
   const client = device;
   const me = device;
   const listener = device.listener;
   const session = device.session;
   const activeServers = device.getServers();
   const server = (activeServers.length > 0 ? activeServers[0] : undefined);
   const servers = new Proxy({}, {
    get: (target, prop) => (typeof prop !== 'string' ? exports.utils.stringify([...session.servers.values()].map(server => server.name).sort()) : session.getServer(prop)),
    set: () => { throw new Error(`The servers proxy does not support setting values.`); },
   });
   const _aDummyFunctionWithSuperLongAndUniquelyStupidNameOhYeah = () => {
    // Curious about the purpose of the dummy function? See the catch block below.
    let result;
    try { result = eval(argstr); }
    catch (error) {
     return device.tell(error.stack
      // First trunkating error.stack from where the dummy function is called.
      .replace(/\n[^_\n]+_aDummyFunctionWithSuperLongAndUniquelyStupidNameOhYeah .+/s, '')
      // Then removing any references to the dummy function (in case the user created functions with this eval or previous evals).
      .replace(/at _?aDummyFunctionWithSuperLongAndUniquelyStupidNameOhYeah \([^\n]+?\:\d+\:\d+\),? ?/g, '')
      // And finally splitting error.stack into lines.
      .split("\n")
     );
    }
    device.tell(exports.utils.stringify(result, { depth: ((Array.isArray(result) || result instanceof Set) ? 2 : 1), indent: 1, details: true }));
   };
   _aDummyFunctionWithSuperLongAndUniquelyStupidNameOhYeah();
  },
 };
};
