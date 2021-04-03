const path = require('path');

module.exports = (main, middleware) => {
 const exports = main.exports;

 middleware.setServerTrigger('fn', 'mooLocalEdit', ({ device, line }) => {
  if (!device.mcp) return;
  else if (device.mcp.mooLocalEdit) {
   // Means we are gathering data.
   const ctx = device.mcp.mooLocalEdit;
   if (line === '.') {
    // End of content block
    device.events.emit('mooLocalEdit', ctx);
    if (device.serverOptions && !device.serverOptions.acceptLocalEdit) return;
    const dirName = exports.dataPath('tmp');
    const baseName = `${exports.utils.sanitizeFileName(ctx.name) || 'tmp'}.txt`;
    const filePath = path.join(dirName, baseName);
    middleware.localEdit({
     filePath,
     content: ctx.content,
     callback: async ({ action, fileContent }) => {
      if (!device.destroyed && device.socket) {
       const content = (fileContent ? fileContent.split(/\r\n|\r|\n/) : []);
       await middleware.confirm({
        message: `Ready to submit ${content.length === 1 ? 'that line' : `those ${content.length} lines`} of text after executing the following command: ${ctx.upload}`,
        noMessage: `Not sending it.`,
       });
       const lines = [
        ctx.upload,
        ...content.map(line => {
         if (line) {
          if (line === '.') return '..';
          else if (line.toLowerCase() === '@abort') return '.@abort';
         }
         return line;
        }),
        '.',
        '',
       ];
       device.write({ device, lines, skipMiddleware: true, noForwarding: true });
      }
     },
    });
   }
   else if ((Date.now() - ctx.time) > ctx.maxTime) {
    exports.log(`MOO Local Edit error: Max time exceeded (${ctx.maxTime}+ ms).`);
   }
   else if (ctx.content.length >= ctx.maxLines) {
    exports.log(`MOO Local Edit error: Max number of lines exceeded (${ctx.maxLines}+).`);
   }
   else return ctx.content.push(line);
   device.mcp.mooLocalEdit = undefined;
  }
  else if (line.startsWith('#$# edit name: ')) {
   const match = line.match(/^#\$# edit name: (.+) upload: (.+)$/);
   if (match) {
    const rawFields = match.slice(1, 3);
    const fields = rawFields.map(str => {
     if (str.length > 1 && str[0] === '"' && str.endsWith('"')) {
      try { return JSON.parse(str); }
      catch (error) { return str.slice(1, -1); }
     }
     else return str;
    });
    const [rawName, rawUpload] = rawFields;
    const [name, upload] = fields;
    device.mcp.mooLocalEdit = {
     name, upload, rawName, rawUpload,
     content: [],
     maxLines: 1000,
     maxTime: 10000,
     time: new Date(),
    };
   }
  }
 });
};
