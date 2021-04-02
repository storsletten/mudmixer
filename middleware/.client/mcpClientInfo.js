module.exports = (main, middleware) => {
 const exports = main.exports;

 middleware.setCommand('#$#dns-com-vmoo-client-info', ({ device, argstr }) => {
  if (!device.mcp) return;
  else if (!argstr.startsWith(device.mcp.authKey)) return;
  else {
   const match = argstr.slice(device.mcp.authKey.length).match(/^ name: (.+?) text-version: (.+?) internal-version: (.+?) reg-id: (.+?) flags: (.+)$/);
   if (match) {
    const rawFields = match.slice(1, 6);
    const fields = rawFields.map(str => {
     if (str.length > 1 && str[0] === '"' && str.endsWith('"')) {
      try { return JSON.parse(str); }
      catch (error) { return str.slice(1, -1); }
     }
     else return str;
    });
    const [ rawName, rawTextVersion, rawInternalVersion, rawRegId, rawFlags ] = rawFields;
    const [ name, textVersion, internalVersion, regId, flags ] = fields;
    const oldClientInfo = device.mcp.clientInfo;
    const newClientInfo = {
     name, textVersion, internalVersion, regId, flags,
     rawName, rawTextVersion, rawInternalVersion, rawRegId, rawFlags,
    };
    device.mcp.clientInfo = newClientInfo;
    device.events.emit('mcpClientInfo', newClientInfo, oldClientInfo);
   }
  }
 });
};
