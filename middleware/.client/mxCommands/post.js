module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `[filename]`,
  commands: ['mxp'],
  aliases: ['p'],
  help: [
   `Opens local edit for posting data to a server.`,
   `If a file name is not provided, then it will use "post" as the name. The suffix .txt will always be appended.`,
   `All posts can be found inside the posts folder (see MX DIR).`,
  ],
  action: function({ device, middleware, argstr }) {
   const fileName = argstr.trim() || 'post';
   const invalidCharacters = exports.utils.invalidFileName(fileName);
   if (invalidCharacters) return device.tell(`The file name can't contain ${invalidCharacters.join(', ')}`);
   const baseName = (fileName.toLowerCase().endsWith('.txt') ? fileName : `${fileName}.txt`);
   const filePath = exports.dataPath('posts', baseName);
   middleware.localEdit({
    filePath,
    callback: async ({ action, fileContent }) => {
     if (!device.session) return action.reject();
     if (!fileContent) return;
     const servers = device.getActiveServers();
     if (servers.length === 0) return device.tell(`You are not connected to a server.`);
     const lines = fileContent.split(/\r\n|\r|\n/);
     await middleware.confirm({
      message: `Are you sure you wish to send ${lines.length === 1 ? `that line of text` : `those ${lines.length} lines of text`} to ${exports.utils.englishList(servers.map(server => server.name || server.title()))}?`,
      noMessage: `Not sending it.`,
     });
     if (!device.session) return action.reject();
     const sentTo = servers.filter(server => {
      if (!server.destroyed && server.socket && !server.socket.destroyed && !server.disconnectedTime && !server.reconnectingTime && !server.connectingTime) {
       server.write({ device, lines });
       return true;
      }
     });
     if (sentTo.length === 0) device.tell(`Couldn't send it.`);
     else device.tell(`Sent to ${exports.utils.englishList(sentTo.map(server => server.name || server.title()))}.`);
    },
   });
  },
 };
};
