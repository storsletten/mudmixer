const fs = require('fs');
const path = require('path');

module.exports = (main) => {
 const exports = main.exports;

 class Session {
  constructor(options) {
   this.active = false;
   this.data = {
    options: {
     runInBackground: false,
     textEditor: '',
     defaultLogger: {},
    },
    servers: [],
   };
   this.clients = new Set();
   this.servers = new Map();
   if (options) this.set(options);
  }

  title() {
   return this.name ? `Session ${this.name}` : `Unnamed Session`;
  }
  setName(newName) {
   const lcNewName = newName.toLowerCase();
   const oldName = this.name;
   const lcOldName = (typeof oldName === 'string' ? oldName.toLowerCase() : '');
   if (exports.sessions.has(lcNewName)) throw new Error(`There is already a session named ${newName}.`);
   if (oldName !== undefined) {
    if (exports.sessions.get(lcOldName) === this) exports.sessions.delete(lcOldName);
    else throw new Error(`${this.title()} seems to be missing in the sessions map.`);
   }
   this.name = newName;
   exports.sessions.set(lcNewName, this);
   if (oldName !== undefined) return exports.renameSessionFile(oldName, newName);
  }

  close() {
   if (this.destroyed) return;
   this.destroyed = true;
   this.deactivate(true);
   this.unset();
  }

  set(options) {
   if (options.name) this.setName(options.name);
   if (this.name === undefined) throw new Error(`Session has no name.`);
   if (options.filePath) this.filePath = options.filePath;
   if (options.data) this.updateData(options.data);
  }
  unset() {
   exports.sessions.delete(this.name.toLowerCase());
   this.servers.forEach(device => device.unsetSession());
   this.clients.forEach(device => device.unsetSession());
  }

  activate() {
   this.active = true;
   this.servers.forEach(device => {
    if (!device.socket && !device.serverOptions.disabled && !device.disconnectedTime && !device.connectingTime && !device.reconnectingTime) device.createSocket();
   });
  }
  deactivate(force) {
   if (force || !this.data.options.runInBackground) {
    this.active = false;
    this.servers.forEach(device => device.socket && device.socket.destroy());
    this.clients.forEach(device => device.close('sessionDeactivate'));
   }
  }

  getServer(name) {
   const lcName = name.toLowerCase();
   const device = this.servers.get(lcName);
   if (device) return device;
   else if (lcName) {
    for (let [serverName, device] of this.servers) {
     if (serverName.toLowerCase().startsWith(lcName)) return device;
    }
   }
  }

  addClient(device) {
   if (device.session) throw new Error(`${device.title()} has a session assigned already.`);
   else if (this.clients.has(device)) return;
   else device.setSession(this);
  }

  addServer(serverOptions) {
   if (this.destroyed) return;
   if (this.getServer(serverOptions.name)) throw new Error(`A server with the name ${JSON.stringify(serverOptions.name)} already exists in ${this.title()}.`);
   const lcName = serverOptions.name.toLowerCase();
   exports.utils.pruneRegularObject(serverOptions, exports.defaultServerOptions, { fix: true });
   exports.utils.mergeRegularObject(serverOptions, exports.defaultServerOptions, { overwrite: false });
   if (!this.data.servers.some(options => options.name.toLowerCase() === lcName)) {
    this.data.servers.push(serverOptions);
   }
   ['middleware', 'readLoggers', 'writeLoggers'].forEach(prop => {
    if (!Array.isArray(serverOptions[prop])) {
     serverOptions[prop] = (typeof serverOptions[prop] === 'string' ? [serverOptions[prop]] : []);
    }
   });
   const server = new exports.Server({
    session: this,
    name: serverOptions.name,
    serverOptions,
    middleware: new exports.Middleware(),
   });
   ['readLoggers', 'writeLoggers'].forEach(prop => {
    serverOptions[prop].forEach(name => {
     if (typeof name === 'string') server[prop].add(exports.getLogger(name));
    });
   });
   (async () => {
    if (this.destroyed || server.destroyed) return;
    if (server.middleware) {
     // Loading the default .server middleware only if no custom script has already added middleware packages.
     if (server.middleware.packages.size === 0) await server.middleware.loadPackage('.server');
     for (let packageName of serverOptions.middleware) {
      if (typeof packageName === 'string') await server.middleware.loadPackage(packageName);
     }
    }
    if (this.active && !serverOptions.disabled && !server.socket && !server.connectingTime && !server.reconnectingTime && !server.disconnectedTime) server.createSocket();
   })();
   return server;
  }
  removeServer(serverOptions) {
   const lcName = serverOptions.name.toLowerCase();
   const device = this.servers.get(lcName);
   if (device) device.close('sessionRemoveServer');
   const index = this.data.servers.findIndex(options => options.name.toLowerCase() === lcName);
   if (index !== -1) this.data.servers.splice(index, 1);
  }

  update() {
   exports.utils.changePrototypeOf(this, exports.Session.prototype);
  }

  async updateData(newData) {
   // newData may be altered as a sideeffect of processing.
   // If that is not desirable, then clone the data before passing it to this method.
   //
   // newDataString is used at the end to see if any changes happened.
   const newDataString = JSON.stringify(newData);
   const newOptions = (exports.utils.isRegularObject(newData.options) ? newData.options : {});
   const newServers = new Map();
   if (Array.isArray(newData.servers)) {
    newData.servers.forEach(serverOptions => {
     if (exports.utils.isRegularObject(serverOptions) && serverOptions.host && typeof serverOptions.host === 'string') {
      if (typeof serverOptions.port !== 'number') serverOptions.port = parseInt(serverOptions.port);
      if (isNaN(serverOptions.port) || serverOptions.port <= 0 || serverOptions.port > 65535) throw new Error(`Invalid port number for ${serverOptions.name || serverOptions.host}`);
      if (typeof serverOptions.name !== 'string' || serverOptions.name.trim() === '') serverOptions.name = `${serverOptions.host}${serverOptions.port}`;
      const name = exports.utils.sanitizeFileName(serverOptions.name.trim());
      const lcName = name.toLowerCase();
      if (newServers.has(lcName)) throw new Error(`Server name occurring twice: ${serverOptions.name}`);
      serverOptions.name = name;
      newServers.set(lcName, serverOptions);
     }
    });
   }
   // Make sure newOptions don't introduce options that won't be recognized
   exports.utils.pruneRegularObject(newOptions, this.data.options, { fix: true });
   // Merge newOptions into this.data.options
   exports.utils.mergeRegularObject(this.data.options, newOptions, { overwrite: true });
   // Remove servers that shouldn't exist anymore
   this.data.servers.forEach(serverOptions => {
    if (!newServers.has(serverOptions.name.toLowerCase())) this.removeServer(serverOptions);
   });
   // Add new servers.
   newServers.forEach(serverOptions => {
    if (!this.data.servers.some(serverOptions2 => serverOptions.name === serverOptions2.name)) this.addServer(serverOptions);
   });
   // Activate the session if the runInBackground option is set.
   if (this.data.options.runInBackground && !this.active) this.activate();
   // And finally, see if we need to save any changes
   if (JSON.stringify(this.data) !== newDataString) await this.save();
  }

  async save() {
   const dataString = JSON.stringify(this.data, null, 1);
   const filePath = path.resolve(this.filePath);
   const dirName = path.dirname(filePath);
   const baseName = path.basename(filePath);
   const watcher = exports.directoryWatchers.get(dirName);
   const fileIgnored = watcher && watcher.ignoreFile({ name: baseName });
   try {
    await fs.promises.writeFile(this.filePath, dataString, { encoding: 'binary' });
    exports.log(`Saved session ${this.name}.`);
   }
   catch (error) { exports.log(`Couldn't save session ${this.name}:`, error); }
   finally { if (fileIgnored) watcher.unignoreFile({ name: baseName }); }
  }
 }

 exports.Session = Session;
};
