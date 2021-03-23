// https://www.moo.mud.org/mcp2/simpleedit.html

const crypto = require('crypto');
const path = require('path');

module.exports = (main, middleware) => {
 const exports = main.exports;

 middleware.setServerCommand('#$#dns-org-mud-moo-simpleedit-content', ({ device, argstr }) => {
  if (!device.mcp) return;
  else if (!argstr.startsWith(device.mcp.authKey || '')) return;
  else {
   const match = argstr.match(/reference: (.+?) name: "(.+?)" type: (.+?) content(\*?): "(.*?)" _data-tag: (.+)/);
   if (match) {
    if (!device.mcp.simpleEdit) device.mcp.simpleEdit = {};
    const simpleEdit = device.mcp.simpleEdit;
    if (!simpleEdit.sessions) simpleEdit.sessions = new Map();
    const [ , reference, name, type, isMultiline, content, tag] = match;
    const session = {
     reference, name, type, tag,
     content: (content ? [content] : []),
     isMultiline: Boolean(isMultiline),
     time: new Date(),
     callback: () => {
      simpleEdit.sessions.delete(tag);
      if (device.destroyed || !device.serverOptions || !device.serverOptions.acceptLocalEdit) return;
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
          `#$#dns-org-mud-moo-simpleedit-set ${device.mcp.authKey} reference: ${reference} type: ${type} content*: "" _data-tag: ${tag}`,
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
