module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `name`,
  aliases: ['cn', 'cname', 'name-connection', 'rename-connection', 'connection-rename'],
  help: [
   `This command renames an outgoing (server) connection.`,
  ],
  action: async function({ device, middleware, argstr }) {
   const server = await middleware.selectServer({ argstr });
   const newServerName = await middleware.prompt({
    abortOnBlank: true,
    message: `Enter a new name for the ${server.name || server.title()} connection:`,
   });
   const invalidCharacters = exports.utils.invalidFileName(newServerName);
   if (invalidCharacters) return device.tell(`The new name can't contain ${invalidCharacters.join(', ')}`);
   const oldName = server.name;
   if (oldName === newServerName) return device.tell(`That connection is already named ${oldName}.`);
   await server.setName(newServerName);
   device.tell(`${oldName || 'That connection'} is now known as ${newServerName}.`);
  },
 };
};
