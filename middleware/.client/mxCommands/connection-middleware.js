module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `[name]`,
  commands: ['mxcm'],
  aliases: ['cm', 'cmiddleware', 'middleware-connection'],
  help: [
   `This command manages the middleware of a connection.`,
   `If no name is provided, this command uses your current client connection.`,
  ],
  action: function({ device, middleware, argstr }) {
   const serverName = argstr.trim();
   const connection = (serverName ? device.session.getServer(serverName) : device);
   if (!connection) return device.tell(`There is no connection with that name.`);
   if (connection.destroyed) return device.tell(`That connection has been closed.`);
   if (!connection.middleware) connection.setMiddleware(new exports.Middleware());
   (async () => {
    const excludedPackages = ['.client', '.server'];
    while (!device.destroyed) {
     const packages = await exports.getMiddlewarePackages();
     const choices = [...(new Set([...packages.keys(), ...connection.middleware.packages.keys()]))]
      .filter(packageName => !excludedPackages.includes(packageName.toLowerCase()))
      .sort()
      .map(packageName => [packageName, !connection.middleware.packages.has(packageName)]);
     if (choices.length === 0) return device.tell(`Found no middleware.`);
     const { choiceIndex } = await middleware.menu(choices.map(choice => `${choice[1] ? 'Enable' : 'Disable'} ${choice[0]}`));
     if (connection.destroyed) return device.tell(`That connection has been closed.`);
     else if (!connection.middleware) return device.tell(`That connection has no middleware instance anymore.`);
     const [ packageName, enable ] = choices[choiceIndex];
     if (connection.middleware.packages.has(packageName) === enable) device.tell(`That middleware is already ${enable ? 'enabled' : 'disabled'}.`);
     else {
      if (enable) {
       const success = await connection.middleware.loadPackage(packageName);
       if (!success) continue;
      }
      else connection.middleware.unloadPackage(packageName);
      if (device === connection) device.tell(`${enable ? 'Enabled' : 'Disabled'} ${packageName}.`);
      else {
       if (connection.serverOptions && connection.serverOptions.middleware.includes(packageName) !== enable) {
        if (enable) connection.serverOptions.middleware.push(packageName);
        else {
         const index = connection.serverOptions.indexOf(packageName);
         // There is no reason why index is -1 here (since we checked with .includes above), but better safe than sorry.
         if (index !== -1) connection.serverOptions.middleware.splice(index, 1);
        }
        if (connection.session) await connection.session.save();
       }
       device.tell(`${enable ? 'Enabled' : 'Disabled'} ${packageName} for ${connection.name || connection.title()}.`);
      }
     }
    }
   })();
  },
 };
};
