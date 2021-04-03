const fs = require('fs');
const path = require('path');

module.exports = async (main, middleware) => {
 const exports = main.exports;

 const excludedFileNames = [path.basename(__filename)];

 const aliases = new Map();
 const commands = new Map();

 (await fs.promises.readdir(__dirname, { withFileTypes: true })).forEach(file => {
  if (!excludedFileNames.includes(file.name) && file.name.toLowerCase().endsWith('.js') && !file.isDirectory()) {
   const command = require(`./${file.name}`)(main, middleware);
   if (!command.name) command.name = file.name.trimStart().slice(0, -3);
   commands.set(command.name.toLowerCase(), command);
   if (command.aliases) command.aliases.forEach(alias => aliases.set(alias.toLowerCase(), command));
   if (command.commands) command.commands.forEach(name => middleware.setCommand(name, command.action));
  }
 });

 const resolveCommand = (cmd) => {
  const lcCommand = cmd.trim().toLowerCase();
  const command = commands.get(lcCommand) || aliases.get(lcCommand);
  if (command) return command;
  if (lcCommand) {
   for (let [commandName, command] of commands) {
    if (commandName.startsWith(lcCommand)) return command;
   }
   for (let [alias, command] of aliases) {
    if (alias.startsWith(lcCommand)) return command;
   }
  }
 };

 middleware.setCommand(exports.config.mxCommand || 'mx', params => {
  const { device, args } = params;
  const requestedCommand = args.shift() || '';
  const command = resolveCommand(requestedCommand);
  if (!command || (!device.session && command.sessionRequired !== false)) {
   if (requestedCommand) device.tell(`There is no MX command named ${JSON.stringify(requestedCommand)}.`);
   else {
    device.tell('Available MX commands:');
    [...commands].sort((a, b) => a[0].localeCompare(b[0])).forEach(ent => {
     const [commandName, command] = ent;
     if (commandName && (device.session || command.sessionRequired === false)) device.tell(`- ${commandName} ${command.syntax || ''}`.trimEnd());
    });
   }
  }
  else {
   const { action } = command;
   if (action) action.call(command, { ...params, command, commands, aliases, argstr: params.argstr.slice(params.argstr.indexOf(requestedCommand) + requestedCommand.length).trimStart() });
   else device.tell(`That command has not been coded yet.`);
  }
 });
};
