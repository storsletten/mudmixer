// https://github.com/sevenecks/lambda-moo-programming/blob/master/code/LocalEditing.md

const path = require('path');

module.exports = (main, middleware) => {
 const exports = main.exports;

 middleware.setServerTrigger('#$#', ({ device, argstr }) => {
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
      const dirName = exports.dataPath('tmp');
      const baseName = exports.utils.sanitizeFileName(reference);
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
          '#$#:',
          '',
         ];
         device.write({ device, lines, skipMiddleware: true, noForwarding: true });
        }
       },
      });
     },
    };
    if (session.isMultiline) {
     simpleEdit.sessions.set(tag, session);
     simpleEdit.lastTag = tag;
    }
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
    if (session) {
     simpleEdit.lastTag = tag;
     session.content.push(line);
    }
   }
  }
 });

 middleware.setServerCommand('#$#:', () => {
  if (!device.destroyed && device.mcp && device.mcp.simpleEdit && device.mcp.simpleEdit.sessions) {
   const simpleEdit = device.mcp.simpleEdit;
   const session = simpleEdit.sessions.get(simpleEdit.lastTag);
   if (session) session.callback();
  }
 });
};
