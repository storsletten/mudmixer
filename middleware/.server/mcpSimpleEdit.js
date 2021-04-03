// https://www.moo.mud.org/mcp2/simpleedit.html

const crypto = require('crypto');
const path = require('path');

module.exports = (main, middleware) => {
 const exports = main.exports;

 middleware.setServerCommand('#$#dns-org-mud-moo-simpleedit-content', ({ device, argstr }) => {
  if (!device.mcp) return;
  else if (!argstr.startsWith(device.mcp.authKey)) return;
  else {
   const match = argstr.slice(device.mcp.authKey.length).match(/^ reference: (.+?) name: (.+?) type: (.+?) content(\*?): (.+) _data-tag: (.+)$/);
   if (match) {
    if (!device.mcp.simpleEdit) device.mcp.simpleEdit = {};
    const simpleEdit = device.mcp.simpleEdit;
    if (!simpleEdit.sessions) simpleEdit.sessions = new Map();
    const isMultiline = Boolean(match[4]);
    const rawFields = [...match.slice(1, 4), ...match.slice(5, 7)];
    const fields = rawFields.map(str => {
     if (str.length > 1 && str[0] === '"' && str.endsWith('"')) {
      try { return JSON.parse(str); }
      catch (error) { return str.slice(1, -1); }
     }
     else return str;
    });
    const [ rawReference, rawName, rawType, rawContent, rawTag ] = rawFields;
    const [ reference, name, type, content, tag ] = fields;
    const session = {
     reference, name, type, isMultiline, tag,
     content: (content ? [content] : []),
     time: new Date(),
     rawReference, rawName, rawType, rawTag,
     callback: () => {
      simpleEdit.sessions.delete(tag);
      if (device.destroyed) return;
      device.events.emit('mcpSimpleEdit', session);
      (device.getClients()
       .filter(client => client.mcp && client.mcp.packages['dns-org-mud-moo-simpleedit'])
       .forEach(client => {
        const tag = crypto.randomBytes(3).toString('hex');
        const lines = [
         `#$#dns-org-mud-moo-simpleedit-content ${client.mcp.authKey} reference: ${rawReference} name: ${rawName} type: ${rawType} content*: "" _data-tag: ${tag}`,
         ...session.content.map(line => `#$#* ${tag} content: ${line}`),
         `#$#: ${tag}`,
         '',
        ];
        client.write({ device, lines, skipMiddleware: true, noForwarding: true });
       })
      );
      if (device.serverOptions && !device.serverOptions.acceptLocalEdit) return;
      const dirName = exports.dataPath('tmp');
      const baseName = `${exports.utils.sanitizeFileName(reference) || 'tmp'}.txt`;
      const filePath = path.join(dirName, baseName);
      middleware.localEdit({
       filePath,
       content: session.content,
       callback: async ({ action, fileContent }) => {
        if (!device.destroyed && device.socket) {
         const tag = crypto.randomBytes(3).toString('hex');
         const lines = [
          `#$#dns-org-mud-moo-simpleedit-set ${device.mcp.authKey} reference: ${rawReference} type: ${rawType} content*: "" _data-tag: ${tag}`,
          ...fileContent.split(/\r\n|\r|\n/).map(line => `#$#* ${tag} content: ${line}`),
          `#$#: ${tag}`,
          '',
         ];
         device.write({ device, lines, skipMiddleware: true, noForwarding: true });
        }
       },
      });
     },
    };
    if (session.isMultiline) simpleEdit.sessions.set(tag, session);
    else session.callback();
   }
  }
 });

 middleware.setServerCommand('#$#*', ({ device, argstr }) => {
  if (!device.destroyed && device.mcp && device.mcp.simpleEdit && device.mcp.simpleEdit.sessions) {
   const match = argstr.match(/^(.+?) content: (.*)$/);
   if (match) {
    const [ , tag, line ] = match;
    const simpleEdit = device.mcp.simpleEdit;
    const session = simpleEdit.sessions.get(tag);
    if (session) session.content.push(line);
   }
  }
 });

 middleware.setServerCommand('#$#:', ({ device, argstr }) => {
  if (!device.destroyed && device.mcp && device.mcp.simpleEdit && device.mcp.simpleEdit.sessions) {
   const session = device.mcp.simpleEdit.sessions.get(argstr);
   if (session) session.callback();
  }
 });
};
