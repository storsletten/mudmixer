module.exports = main => {
 const exports = main.exports;
 const Device = exports.Device;

 class Client extends Device {
  constructor(options) {
   super(options);
   exports.utils.mergeRegularObject(this.config, {
    gagMode: 'hybrid',
   }, { overwrite: false });
  }

  title() {
   return `Client ${this.id || '0'}`;
  }

  isClient() { return true; }

  set(options = {}) {
   if (options.listener) this.listener = options.listener;
   this.id = options.id || this.id || (++exports.clientsCount);
   super.set(options);
   exports.events.emit('clientSet', this, options);
  }
  unset() {
   super.unset();
   if (this.listener) this.unsetListener();
  }

  setSocket(socket) {
   super.setSocket(socket);
   this.socketEvents.on('error', error => exports.log(`${this.title()} socket error:`, error));
   this.socketEvents.on('end', () => {
    this.socket.ended = true;
    this.close('socketEnd');
   });
   this.socketEvents.on('close', () => this.close('socketClose'));
  }

  setListener(listener) {
   if (this.listener) this.unsetListener();
   listener.clients.add(this);
   this.listener = listener;
  }
  unsetListener() {
   this.listener.clients.delete(this);
   this.listener = undefined;
  }

  setSession(session) {
   super.setSession(session);
   session.clients.add(this);
   exports.log(`${this.title()} logged in to ${session.title()}.`);
   if (session.servers.size > 0) {
    session.servers.forEach(device => device.setReadPipe(this));
    if (!this.hasServers()) this.switchServer(session.servers.values().next().value);
   }
   if (!session.active) session.activate();
  }
  unsetSession() {
   if (this.session) {
    this.session.clients.delete(this);
    if (this.session.clients.size === 0 && !this.session.data.options.runInBackground) this.session.deactivate();
    super.unsetSession();
   }
  }

  tell(...objects) {
   const lines = this.stringifyObjects(objects);
   this.write({ device: this, lines });
  }
  tellServer(...objects) {
   const lines = this.stringifyObjects(objects);
   this.read({ device: this, lines });
  }

  switchServer(server) {
   const servers = this.getServers();
   if (servers.length > 0) this.unsetReadPipe(...servers);
   if (server) {
    this.setReadPipe(server);
    if (server.readLoggers.size > 0) this.currentLoggerName = server.readLoggers.values().next().value.name;
   }
   if (this.config.gagMode === 'focused') {
    this.getServers(this.pipesFrom).forEach(device => {
     if (device === server) this.ignore.delete(device);
     else this.ignore.add(device);
    });
   }
  }

  update() {
   super.update();
   exports.utils.changePrototypeOf(this, exports.Client.prototype, { depth: 2 });
  }
 }

 exports.Client = Client;
};
