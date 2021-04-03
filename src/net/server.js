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
    if (options.connect) this.createSocket(exports.utils.isRegularObject(options.connect) ? options.connect : this.config);
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
      const config = this.session.data.servers.find(config => config.name === oldName);
      if (config) {
       config.name = newName;
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
   if (options.name) this.setName(options.name);
   this.id = options.id || this.id || (++exports.serversCount);
   super.set(options);
   exports.events.emit('serverSet', this, options);
  }

  createSocket(options = this.config) {
   if (this.socket) throw new Error(`${this.title()} has already a socket.`);
   else if (this.listener) throw new Error(`${this.title()} cannot create an outgoing socket because it has a listener.`);
   else if (this.connectingTime) throw new Error(`${this.title()} is already connecting.`);
   else if (!options) throw new Error(`${this.title()} can't create a socket without any options.`);
   if (this.config !== options) this.setConfig(options);
   this.disconnectedTime = undefined;
   this.connectingTime = new Date();
   this.timers.delete('reconnecting');
   const isTLS = options.tls;
   if (!this.reconnectingTime) {
    exports.log(`${this.title()} connecting ${isTLS ? 'securely ' : ''}to ${options.host} on port ${options.port}.`);
    this.read({ device: this, lines: [`Connecting to ${this.name || this.title()} ...`] });
   }
   const socket = (isTLS
    ? tls.connect({ rejectUnauthorized: false, host: options.host, port: options.port })
    : net.createConnection({ host: options.host, port: options.port })
   );
   const events = new exports.utils.Events(socket);
   this.setSocket(socket);
   return (new Promise((resolve, reject) => {
    events.on('error', error => reject(error));
    events.on('close', () => reject('close'));
    events.on(isTLS ? 'secureConnect' : 'connect', () => resolve());
   })).finally(() => {
    events.close();
    this.connectingTime = undefined;
   }).then(() => {
    this.reconnectingTime = undefined;
    exports.log(`${this.title()} successfully connected ${isTLS ? 'securely ' : ''}to ${options.host} on port ${options.port}.`);
    this.events.emitBinaryState('ready');
    if (options.loginCommand) {
     this.tellServer(typeof options.loginCommand === 'string' ? options.loginCommand.split(';').map(str => str.trim()) : options.loginCommand);
    }
    if (this.session && this.config.disabled) {
     this.config.disabled = false;
     this.session.save();
    }
    return true;
   }).catch(reason => {
    if (this.socket) this.unsetSocket(true);
    this.prepareReconnect();
    return false;
   });
  }

  disconnect() {
   if (this.disconnectedTime) return;
   this.disconnectedTime = new Date();
   this.timers.delete('reconnecting');
   this.connectingTime = undefined;
   this.reconnectingTime = undefined;
   this.unsetSocket(true);
   if (!this.config.disabled) {
    this.config.disabled = true;
    if (this.session) this.session.save();
   }
   exports.log(`${this.title()} disconnected.`);
   this.read({ device: this, lines: [`Disconnected ${this.name || this.title()}.`] });
  }

  prepareReconnect(delay) {
   if (this.destroyed) return;
   else if (this.connectingTime) throw new Error(`${this.title()} is already connecting.`);
   else if (this.config.reconnect !== false && (!this.session || this.session.active)) {
    this.timers.setTimeout('reconnecting', delay || this.config.reconnectInterval || 3000, () => this.reconnect());
   }
  }
  reconnect() {
   if (this.connectingTime) throw new Error(`${this.title()} is already connecting.`);
   this.timers.delete('reconnecting');
   if (!this.reconnectingTime) {
    this.reconnectingTime = new Date();
    exports.log(`${this.title()} reconnecting ${this.config.tls ? 'securely ' : ''}to ${this.config.host} on port ${this.config.port}.`);
    this.read({ device: this, lines: [`Reconnecting to ${this.name || this.title()} ...`] });
   }
   this.unsetSocket(true);
   return this.createSocket();
  }

  setSocket(socket) {
   super.setSocket(socket);
   this.socketEvents.on('error', error => this.isActive() && exports.log(`${this.title()} socket error:`, error));
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
     if (this.config.reconnectAggressively || !ended) this.prepareReconnect();
     this.events.emit(ended ? 'remoteSocketClose' : 'socketClose');
     if (ended && !this.config.disabled && !this.reconnectingTime && !this.timers.has('reconnecting')) {
      this.config.disabled = true;
      this.session.save();
     }
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
   super.update();
   exports.utils.changePrototypeOf(this, exports.Server.prototype, { depth: 2 });
  }
 }

 exports.Server = Server;
};
