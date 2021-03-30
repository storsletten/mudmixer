module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `[mode]`,
  commands: ['mxgm'],
  aliases: ['gm', 'cgm', 'cgagmode', 'gag-mode'],
  help: [
   `This command changes the gag mode of your client connection.`,
   `Gag mode affects how gagging will behave when you switch between connections.`,
   `The following modes are currently available:`,
   `- manual: No automation will touch your gag settings.`,
   `- focused: All connections except the one you switch to will be automatically gagged.`,
   `- hybrid: Same as manual except the currently focused connection will ignore your gag settings.`,
   `If no mode is provided, then this command tells you what the current mode is.`,
  ],
  action: function({ device, argstr }) {
   const modes = ['manual', 'focused', 'hybrid'];
   if (argstr) {
    const lcArgstr = argstr.toLowerCase();
    const mode = modes.find(mode => mode.startsWith(lcArgstr));
    if (!mode) device.tell(`Valid gag modes are ${exports.utils.englishList(modes)}.`);
    else {
     device.gagMode = mode;
     device.tell(exports.utils.titlify(device.gagMode));
     if (mode === 'focused') {
      const servers = device.getServers(device.pipesFrom).filter(server => device.ignore.has(server) === false && device.readPipes.has(server) === false);
      if (servers.length > 0) {
       servers.forEach(server => device.ignore.add(server));
       device.tell(`Gagging ${exports.utils.englishList(servers.map(server => server.name || server.title()).sort())}.`);
      }
     }
    }
   }
   else {
    device.tell(`Currently in ${device.gagMode} mode.`);
    device.tell(`Valid gag modes are ${exports.utils.englishList(modes)}.`);
   }
  },
 };
};
