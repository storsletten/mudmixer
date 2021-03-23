module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `name`,
  aliases: ['cl', 'cloggers', 'clogging', 'loggers-connection'],
  help: [
   `This command manages connection logging.`,
  ],
  action: function({ device, middleware, argstr }) {
   const serverName = argstr.trim();
   const server = device.session.getServer(serverName);
   if (!server) return device.tell(`There is no connection with that name.`);
   const serverOptions = server.serverOptions;
   (async () => {
    while (!device.destroyed) {
     const choices = [
      [`Add read logger (incoming data)`],
      [`Add write logger (outgoing data)`],
      [`Add both read and write logger (bidirectional data)`],
     ];
     ['read', 'write'].forEach(type => {
      serverOptions[`${type}Loggers`].forEach(name => choices.push([
       `Remove ${name ? `${type} logger ${name}` : `default ${type} logger`}`,
       type, name,
      ]));
     });
     const { choiceIndex } = await middleware.menu(choices.map(choice => choice[0]));
     if (choiceIndex < 3) {
      const defaultName = device.getCurrentLoggerName();
      const name = (await middleware.prompt({ message: `Type a logger name or enter a blank line if you want to use the ${defaultName || 'default'} logger:` })).trim() || defaultName;
      const logger = exports.getLogger(name);
      const lcName = logger.name.toLowerCase();
      const added = [];
      let save;
      ['read', 'write'].forEach(type => {
       if (choiceIndex === 0 && type === 'write') return;
       if (choiceIndex === 1 && type === 'read') return;
       const loggerNames = serverOptions[`${type}Loggers`];
       if (loggerNames.length === 0 || !loggerNames.some(name => name.toLowerCase() === lcName)) {
        loggerNames.push(logger.name);
        added.push(`${type} logger to the connection options`);
        save = true;
       }
       const loggers = server[`${type}Loggers`];
       if (!loggers.has(logger)) {
        loggers.add(logger);
        added.push(`${type} logger to the connection instance`);
       }
      });
      if (added.length > 0) {
       if (save) await device.session.save();
       device.tell(`Added.`);
      }
      else device.tell(`The connection has that logger already.`);
     }
     else {
      const [menuText, type, name] = choices[choiceIndex];
      const logger = exports.getLogger(name);
      const lcName = logger.name.toLowerCase();
      const removed = [];
      let save;
      const loggerNames = serverOptions[`${type}Loggers`];
      if (loggerNames.length > 0) {
       const loggerNameIndex = loggerNames.findIndex(name => name.toLowerCase() === lcName);
       if (loggerNameIndex !== -1) {
        loggerNames.splice(loggerNameIndex, 1);
        removed.push(`${type} logger from the connection options`);
        save = true;
       }
      }
      const loggers = server[`${type}Loggers`];
      if (loggers.has(logger)) {
       loggers.delete(logger);
       removed.push(`${type} logger from the connection instance`);
      }
      if (removed.length > 0) {
       if (save) await device.session.save();
       device.tell(`Removed.`);
      }
      else device.tell(`The connection doesn't have that logger.`);
     }
    }
   })();
  },
 };
};
