const fs = require('fs');

module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `[filename]`,
  commands: ['mxpp'],
  aliases: ['pp', 'ppost'],
  help: [
   `Sends an existing post to the current server without opening local edit.`,
   `If a file name is not provided, then it will use "post" as the file name. The suffix .txt will always be appended.`,
   `All posts can be found inside the posts folder (see MX DIR).`,
  ],
  action: function({ device, middleware, argstr }) {
   const fileName = argstr.trim() || 'post';
   const invalidCharacters = exports.utils.invalidFileName(fileName);
   if (invalidCharacters) return device.tell(`The file name can't contain ${invalidCharacters.join(', ')}`);
   const baseName = (fileName.toLowerCase().endsWith('.txt') ? fileName : `${fileName}.txt`);
   const filePath = exports.dataPath('posts', baseName);
   (async () => {
    const fileContent = await fs.promises.readFile(filePath, { encoding: 'binary' }).catch(error => {
     if (error instanceof Error && error.code === 'ENOENT') {
      device.tell(`That post does not exist.`);
     }
     else {
      exports.log(`mx postpost error:`, error);
      device.tell(`Couldn't read file ${JSON.stringify(baseName)}.`);
     }
    });
    if (fileContent === undefined) return;
    else if (fileContent === '') return device.tell(`That file is empty.`);
    else {
     const servers = device.getActiveServers();
     if (servers.length === 0) device.tell(`You are not connected to a server.`);
     else {
      const lines = fileContent.split(/(\r\n|\r|\n)/);
      servers.forEach(server => server.write({ device, lines }));
      device.tell(`Sent ${lines.length === 1 ? `1 line` : `${lines.length} lines`} of text to ${exports.utils.englishList(servers.map(server => server.name || server.title()))}.`);
     }
    }
   })();
  },
 };
};
