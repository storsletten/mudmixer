// https://www.moo.mud.org/mcp2/simpleedit.html

const crypto = require('crypto');
const path = require('path');

module.exports = (main, middleware) => {
 const exports = main.exports;

 middleware.setCommand('#$#dns-org-mud-moo-simpleedit-set', ({ device, argstr }) => {
  if (!device.mcp) return;
  else if (!argstr.startsWith(device.mcp.authKey)) return;
  else {
   const match = argstr.slice(device.mcp.authKey.length).match(/^ reference: (.+?) type: (.+?) content(\*?): (.+) _data-tag: (.+)$/);
   if (match) {
    if (!device.mcp.simpleEdit) device.mcp.simpleEdit = {};
    const simpleEdit = device.mcp.simpleEdit;
    if (!simpleEdit.sessions) simpleEdit.sessions = new Map();
    const isMultiline = Boolean(match[3]);
    const rawFields = [...match.slice(1, 3), ...match.slice(4, 6)];
    const fields = rawFields.map(str => {
     if (str.length > 1 && str[0] === '"' && str.endsWith('"')) {
      try { return JSON.parse(str); }
      catch (error) { return str.slice(1, -1); }
     }
     else return str;
    });
    const [ rawReference, rawType, rawContent, rawTag ] = rawFields;
    const [ reference, type, content, tag ] = fields;
    const session = {
     reference, type, isMultiline, tag,
     content: (content ? [content] : []),
     time: new Date(),
     rawReference, rawType, rawTag,
     callback: () => {
      simpleEdit.sessions.delete(tag);
      if (device.destroyed) return;
      device.events.emit('mcpSimpleEdit', session);
      (device.getActiveServers()
       .filter(server => server.mcp && server.mcp.packages['dns-org-mud-moo-simpleedit'])
       .forEach(server => {
        const tag = crypto.randomBytes(3).toString('hex');
        const lines = [
         `#$#dns-org-mud-moo-simpleedit-set ${server.mcp.authKey} reference: ${rawReference} type: ${rawType} content*: "" _data-tag: ${tag}`,
         ...session.content.map(line => `#$#* ${tag} content: ${line}`),
         `#$#: ${tag}`,
         '',
        ];
        server.write({ device, lines, skipMiddleware: true, noForwarding: true });
       })
      );
     },
    };
    if (session.isMultiline) simpleEdit.sessions.set(tag, session);
    else session.callback();
   }
  }
 });

 middleware.setCommand('#$#*', ({ device, argstr }) => {
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

 middleware.setCommand('#$#:', ({ device, argstr }) => {
  if (!device.destroyed && device.mcp && device.mcp.simpleEdit && device.mcp.simpleEdit.sessions) {
   const session = device.mcp.simpleEdit.sessions.get(argstr);
   if (session) session.callback();
  }
 });
};
