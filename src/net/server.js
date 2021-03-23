const net = require('net');
const tls = require('tls');

module.exports = main => {
 const exports = main.exports;
 const Device = exports.Device;

 class Server extends Device {
  constructor(options) {
   super(options);
   if (options) {
    exports.log(`${this.title()}${this.name ? ` (named ${this.name})` : ''} created${this.session ? ` for ${this.session.title()}` : ''}.`);
    if (options.connect) this.createSocket(exports.utils.isRegularObject(options.connect) ? options.connect : this.serverOptions);
   }
  }

  title() { return `Server ${this.id || '0'}`; }

  setName(newName) {
   let promise;
   const oldName = this.name;
   if (oldName !== undefined) {
    const lcNewName = newName.toLowerCase();
    const lcOldName = oldName.toLowerCase();
    if (this.session) {
     if (this.session.servers.get(lcOldName) === this) {
      this.session.servers.delete(lcOldName);
      this.session.servers.set(lcNewName, this);
      const serverOptions = this.session.data.servers.find(serverOptions => serverOptions.name === oldName);
      if (serverOptions) {
       serverOptions.name = newName;
       promise = this.session.save();
      }
     }
     else throw new Error(`Old server name was not found or didn't match ${this.title()}.`);
    }
   }
   this.name = newName;
   return promise;
  }

  isClient() { return false; }

  set(options = {}) {
   if (options.serverOptions) this.serverOptions = options.serverOptions;
   if (options.name) this.setName(options.name);
   this.id = options.id || this.id || (++exports.serversCount);
   super.set(options);
   exports.events.emit('serverSet', this, options);
  }
  unset() {
   super.unset();
   if (this.serverOptions) this.serverOptions = undefined;
  }

  createSocket(options = this.serverOptions) {
   if (this.socket) throw new Error(`${this.title()} has already a socket.`);
   else if (this.listener) throw new Error(`${this.title()} cannot create an outgoing socket because it has a listener.`);
   else if (this.connectingTime) throw new Error(`${this.title()} is already connecting.`);
   else if (!options) throw new Error(`${this.title()} can't create a socket without any options.`);
   if (this.serverOptions !== options) this.serverOptions = options;
   this.disconnectedTime = undefined;
   this.connectingTime = new Date();
   this.timers.delete('reconnecting');
   const isTLS = options.tls;
   if (!this.reconnectingTime) {
    exports.log(`${this.title()} connecting ${isTLS ? 'securely ' : ''}to ${options.host} on port ${options.port}.`);
    this.read({ device: this, lines: [`Connecting to ${this.name || this.title()} ...`] });
   }
   const socket = (isTLS
    ? tls.connect({ rejectUnauthorized: false, ...options })
    : net.createConnection(options)
   );
   this.setSocket(socket);
   const events = new exports.utils.Events(socket);
   return (new Promise((resolve, reject) => {
    events.on('error', () => reject(error));
    events.on('close', () => reject('close'));
    events.on(isTLS ? 'secureConnect' : 'connect', () => resolve());
   })).then(() => {
    this.reconnectingTime = undefined;
    exports.log(`${this.title()} successfully connected ${isTLS ? 'securely ' : ''}to ${options.host} on port ${options.port}.`);
    this.events.emitBinaryState('ready');
    if (options.loginCommand) {
     this.tellServer(typeof options.loginCommand === 'string' ? options.loginCommand.split(';').map(str => str.trim()) : options.loginCommand);
    }
    return true;
   }).catch(() => {
    if (!socket.destroyed) {
     socket.destroy();
     socket.unref();
    }
    if (this.connectingTime) this.prepareReconnect();
    return false;
   }).finally(() => {
    events.close();
    this.connectingTime = undefined;
   });
  }

  disconnect() {
   if (this.disconnectedTime) return;
   this.disconnectedTime = new Date();
   this.timers.delete('reconnecting');
   this.connectingTime = undefined;
   this.reconnectingTime = undefined;
   this.unsetSocket(true);
   exports.log(`${this.title()} disconnected.`);
   this.read({ device: this, lines: [`Disconnected ${this.name || this.title()}.`] });
  }

  prepareReconnect() {
   if (!this.serverOptions) throw new Error(`${this.title()} has no serverOptions to use for reconnecting.`);
   else if (this.listener) throw new Error(`${this.title()} can't reconnect to a listener.`);
   else if (this.connectingTime) throw new Error(`${this.title()} is already connecting.`);
   else if (this.serverOptions.reconnect !== false && (!this.session || this.session.active)) {
    this.timers.setTimeout('reconnecting', this.serverOptions.reconnectInterval || 3000, () => this.reconnect());
   }
  }
  reconnect() {
   if (!this.serverOptions) throw new Error(`${this.title()} has no serverOptions to use for reconnecting.`);
   else if (this.listener) throw new Error(`${this.title()} can't reconnect to a listener.`);
   else if (this.connectingTime) throw new Error(`${this.title()} is already connecting.`);
   this.timers.delete('reconnecting');
   if (!this.reconnectingTime) {
    this.reconnectingTime = new Date();
    exports.log(`${this.title()} reconnecting ${this.serverOptions.tls ? 'securely ' : ''}to ${this.serverOptions.host} on port ${this.serverOptions.port}.`);
    this.read({ device: this, lines: [`Reconnecting to ${this.name || this.title()} ...`] });
   }
   this.unsetSocket(true);
   return this.createSocket();
  }

  setSocket(socket) {
   super.setSocket(socket);
   this.socketEvents.on('end', () => {
    this.socket.ended = true;
    this.socket.destroy();
   });
   this.socketEvents.on('close', () => {
    const ended = this.socket.ended;
    this.unsetSocket();
    this.read({ device: this, lines: [`Connection to ${this.name || this.title()} was terminated${ended ? ` by the server` : ''}.`] });
    if (!this.session) this.close(ended ? 'socketEnd' : 'socketClose');
    else {
     if (!this.connectingTime && !this.reconnectingTime) exports.log(`${this.title()} ${ended ? `was disconnected by the server` : `disconnected`}.`);
     if (this.serverOptions && (this.serverOptions.reconnectAggressively || !ended)) this.prepareReconnect();
    }
   });
  }

  setSession(session) {
   super.setSession(session);
   if (this.name !== undefined) session.servers.set(this.name.toLowerCase(), this);
   for (let client of session.clients) {
    this.setReadPipe(client);
    if (!client.hasServers()) client.switchServer(this);
   }
  }
  unsetSession() {
   if (this.session) {
    if (this.name !== undefined) this.session.servers.delete(this.name.toLowerCase());
    super.unsetSession();
   }
  }

  tell(...objects) {
   const lines = this.stringifyObjects(objects);
   this.read({ device: this, lines });
  }
  tellServer(...objects) {
   const lines = this.stringifyObjects(objects);
   this.write({ device: this, lines });
  }

  update() {
   if (exports.Server.prototype !== Object.getPrototypeOf(this)) {
    Object.setPrototypeOf(this, exports.Server.prototype);
    this.lastUpdateTime = new Date();
   }
  }
 }

 exports.Server = Server;
};
