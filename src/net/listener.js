const net = require('net');

module.exports = main => {
 const exports = main.exports;

 class Listener {
  constructor(options) {
   this.clients = new Set();
   this.timers = new exports.utils.Timers();
   this.destroyed = false;
   if (options) {
    this.set(options);
    exports.log(`${this.title()} created.`);
   }
  }

  close(reason) {
   // This method will also close the socket and all associated clients.
   if (this.destroyed) return;
   exports.events.emit('listenerClose', this);
   if (this.id) {
    if (reason) exports.log(`${this.title()} closed. Reason:`, reason);
    else exports.log(`${this.title()} closed.`);
   }
   const socket = this.socket;
   if (socket) socket.close();
   for (let client of this.clients) client.close();
   this.unset();
   if (socket) socket.unref();
   this.destroyed = true;
  }

  title() {
   return this.id ? `Listener ${this.id}` : 'Listener';
  }

  set(options = {}) {
   exports.listeners.set(this, this.clients);
   if (options.socket) this.setSocket(options.socket);
   if (options.clients) {
    for (let client of options.clients) client.setListener(this);
   }
   if (options.socketOptions) this.socketOptions = options.socketOptions;
   if (options.socketOptionsString) this.socketOptionsString = options.socketOptionsString;
   this.id = options.id || this.id || (++exports.listenersCount);
   exports.events.emit('listenerSet', this, options);
  }
  unset() {
   exports.events.emit('listenerUnset', this);
   this.timers.clear();
   if (this.clients.size > 0) {
    for (let client of this.clients) client.unsetListener();
   }
   if (this.socket) this.unsetSocket();
   exports.listeners.delete(this);
  }

  createSocket(options = {}) {
   if (this.socket) throw new Error(`${this.title()} has already a socket.`);
   if (options.id) this.id = options.id;
   this.socketOptions = JSON.parse(this.socketOptionsString = JSON.stringify(options));
   const socket = net.createServer({ pauseOnConnect: true });
   this.setSocket(socket);
   const events = new exports.utils.Events(socket);
   return (new Promise((resolve, reject) => {
    events.on('error', error => reject(error.code || error.message || 'error'));
    events.on('close', () => reject('close'));
    events.on('listening', () => resolve());
    socket.listen(options);
   })).then(() => {
    this.muteStartupErrors = false;
    return true;
   }).catch(reason => {
    socket.close();
    socket.unref();
    throw reason;
   }).finally(() => {
    events.close();
   });
  }

  setSocket(socket) {
   if (this.socket) throw new Error(`${this.title()} has already a socket.`);
   this.socket = socket;
   this.socketEvents = new exports.utils.Events(socket);
   this.socketEvents.on('error', error => this.muteStartupErrors !== true && exports.log(`${this.title()} socket error:`, error));
   this.socketEvents.on('close', () => this.close('Socket was closed.'));
   this.socketEvents.on('connection', socket => {
    const addressData = socket.address();
    const { address, port, family } = addressData;
    const client = new exports.Client({
     socket,
     listener: this,
     middleware: new exports.Middleware(),
    });
    exports.log(`${client.title()} connected from ${exports.utils.formatIPAddress(address)} on port ${port} (via ${this.title()}).`);
    // Give the incomingConnection event a chance to close the connection if it's not wanted.
    if (exports.events.emit('incomingConnection', client, addressData) && client.destroyed) return;
    client.tell(`Welcome to ${exports.title()}!`);
    // Switch to async before we proceed from here.
    (async () => {
     if (client.destroyed) return;
     // If nothing has set a middleware by this time, then set the default middleware.
     if (client.middleware.packages.size === 0) await client.middleware.loadPackage('.client');
     // And again, make sure the client is still alive before we emit ready events.
     if (client.destroyed) return;
     // Emit global clientReady event.
     if (exports.events.emit('clientReady', client) && client.destroyed) return;
     // Set the client to a ready state.
     client.events.emitBinaryState('ready');
     // And finally, resume the socket to allow incoming data to be processed.
     socket.resume();
    })();
   });
   this.socketEvents.on('listening', () => {
    const addressData = socket.address();
    const { address, port, family } = addressData;
    if (!this.id) this.set();
    exports.log(`${this.title()} started listening on port ${port} (${exports.utils.formatIPAddress(this.socketOptions.address || address)}).`);
    exports.events.emit('listenerReady', this, addressData);
   });
  }
  unsetSocket() {
   // This merely unhooks the socket from the listener and removes related events. It does not destroy the socket.
   this.socketEvents.close();
   ['socket', 'socketEvents', 'socketOptions', 'socketOptionsString'].forEach(prop => this[prop] = undefined);
  }

  write(args) {
   if (!this.destroyed) {
    for (let client of this.clients) client.write(args);
   }
  }

  update() {
   if (exports.Listener.prototype !== Object.getPrototypeOf(this)) {
    Object.setPrototypeOf(this, exports.Listener.prototype);
    this.lastUpdateTime = new Date();
   }
  }
 }

 exports.Listener = Listener;
};
