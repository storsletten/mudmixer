module.exports = (main, middleware) => {
 const exports = main.exports;

 const resolveCommand = async ({ device, middleware, argstr, commands, aliases }) => {
  const lcCommand = argstr.trim().toLowerCase();
  const command = commands.get(lcCommand) || aliases.get(lcCommand);
  if (command) return command;
  if (lcCommand) {
   const matches = [...commands, ...aliases].filter(ent => {
    const [commandName, command] = ent;
    return commandName.startsWith(lcCommand) && (device.session || command.sessionRequired === false);
   }).sort((a, b) => a[0] > b[0]);
   if (matches.length > 0) {
    return (matches.length === 1
     ? matches[0][1]
     : matches[(await middleware.menu({ message: `Which help topic did you mean?`, choices: matches.map(ent => ent[0]) })).choiceIndex][1]
    );
   }
  }
 };

 return {
  sessionRequired: false,
  syntax: `[command]`,
  aliases: ['h'],
  help: [
   `Shows information about an MX command.`,
   `If no argument is provided, then this command will show contextual hints.`,
  ],
  action: async function(params) {
   const { device, argstr, commands } = params;
   const command = await resolveCommand(params);
   if (argstr || command) {
    if (!command || (!device.session && command.sessionRequired !== false)) return device.tell(`There is no MX command named ${JSON.stringify(argstr)}.`);
    if (command.syntax) device.tell(`Syntax: mx ${command.name || argstr} ${command.syntax}`);
    else device.tell(`mx ${command.name || argstr}`);
    if (command.aliases && command.aliases.length > 0) {
     device.tell(command.aliases.length === 1
      ? `Alias: ${command.aliases[0]}`
      : `Aliases: ${command.aliases.join(', ')}`
     );
    }
    if (command.commands && command.commands.length > 0) {
     device.tell(command.commands.length === 1
      ? `Additional command: ${command.commands[0]}`
      : `Additional commands: ${command.commands.join(', ')}`
     );
    }
    if (!command.help || (Array.isArray(command.help) && command.help.length === 0)) device.tell(`No additional help is available for the ${JSON.stringify(command.name || argstr)} command.`);
    else if (typeof command.help === 'function') command.help({ ...params, command });
    else device.tell(command.help);
   }
   else {
    device.tell([
     `Most of the ${exports.title()} functionality can be accessed with the MX command, and MX HELP can be used to view more details about specific MX commands.`,
     `For example, MX HELP CA will show info about the mx connection-add command.`,
     '',
     `The following list shows some useful MX commands to get started:`,
     `  MX CA - lets you add a new connection.`,
     `  MX CK - disconnects a connection.`,
     `  MX C - lets you switch between connections.`,
     `  MX Q - terminates your client connection to ${exports.title()}.`,
    ]);
   }
  },
 };
};
