const net = require('net');
const tls = require('tls');

module.exports = main => {
 const exports = main.exports;

 class Device {
  constructor(options) {
   this.creationTime = new Date();
   this.destroyed = false;
   this.config = {
    eol: "\n",
    bufferTTL: 0,
    maxReadHistoryLength: 50,
    maxWriteHistoryLength: 10,
    maxIACHistoryLength: 10,
    db: '',
    middleware: [],
    readLoggers: [],
    writeLoggers: [],
   };
   this.db = undefined;
   this.readHistory = [];
   this.writeHistory = [];
   this.iacHistory = [];
   this.telnetOptions = {
    eor: false,
   };
   this.pipesFrom = new Set();
   this.readPipes = new Set();
   this.writePipes = new Set();
   this.readLoggers = new Set();
   this.writeLoggers = new Set();
   this.ignore = new Set();
   this.events = new exports.utils.Events();
   this.timers = new exports.utils.Timers();
   this.middleware = undefined;
   this.session = undefined;
   if (options) this.set(options);
  }

  close(reason) {
   // This method will also destroy the socket (if one is set).
   if (this.destroyed) return;
   exports.events.emit('deviceClose', this, reason);
   this.destroyed = true;
   if (reason) exports.log(`${this.title()} closed. Reason:`, reason);
   else exports.log(`${this.title()} closed.`);
   if (this.middleware) {
    this.middleware.close();
    this.unsetMiddleware();
   }
   const socket = this.socket;
   if (socket) socket.destroy();
   // Destroying the socket before unsetting it in case something happens that event handlers should catch.
   this.pipesFrom.forEach(device => {
    device.readPipes.delete(this);
    device.writePipes.delete(this);
   });
   this.pipesFrom.clear();
   this.ignore.clear();
   this.unset();
   // And finally unreffing the socket.
   if (socket) socket.unref();
  }

  title() { return `Device ${this.id || '0'}`; }

  set(options = {}) {
   exports.devices.set(this, this.pipesFrom);
   if (options.config) this.setConfig(options.config);
   if (options.socket) {
    this.setSocket(options.socket);
    this.events.emitBinaryState('ready');
   }
   if (options.readPipes) this.setReadPipe(...options.readPipes);
   if (options.writePipes) this.setWritePipe(...options.writePipes);
   if (options.readLoggers) this.setReadLogger(...options.readLoggers);
   if (options.writeLoggers) this.setWriteLogger(...options.writeLoggers);
   if (options.middleware) this.setMiddleware(options.middleware);
   if (options.label) this.setLabel(options.label);
   if (options.session) this.setSession(options.session);
   if (this.events.destroyed) this.events = new exports.utils.Events();
   this.bufferedData = options.bufferedData || this.bufferedData || '';
   this.maxLineLength = options.maxLineLength || this.maxLineLength || (5 * 1024 * 1024);
   if (options.db) this.setDatabase(options.db);
   exports.events.emit('deviceSet', this, options);
  }
  unset() {
   exports.events.emit('deviceUnset', this);
   this.events.close();
   this.timers.clear();
   if (this.middleware) this.unsetMiddleware();
   if (this.readPipes.size > 0) this.unsetReadPipe(...this.readPipes);
   if (this.writePipes.size > 0) this.unsetWritePipe(...this.writePipes);
   if (this.readLoggers.size > 0) this.unsetReadLogger(...this.readLoggers);
   if (this.writeLoggers.size > 0) this.unsetWriteLogger(...this.writeLoggers);
   if (this.socket) this.unsetSocket();
   if (this.session) this.unsetSession();
   if (this.label) this.unsetLabel();
   exports.devices.delete(this);
   this.readHistory.length = 0;
   this.writeHistory.length = 0;
   this.iacHistory.length = 0;
   if (this.db) this.unsetDatabase();
   this.unsetConfig();
  }

  setConfig(newConfig) {
   const oldConfig = this.config;
   exports.utils.mergeRegularObject(newConfig, oldConfig, { overwrite: false });
   this.config = newConfig;
  }
  unsetConfig() {
   this.config = {};
  }

  setSocket(socket) {
   if (!socket) throw new Error(`Missing socket`);
   else if (this.socket) throw new Error(`${this.title()} has already a socket.`);
   else if (socket.destroyed || socket.ended) throw new Error(`That socket is destroyed or ended.`);
   this.socket = socket;
   this.socket.ended = false;
   if (this.socketEvents) this.socketEvents.close();
   if (this.bufferedData) this.bufferedData = '';
   if (this.mcp) this.mcp = undefined;
   this.socketEvents = new exports.utils.Events(socket);
   // Using binary (latin1) encoding to preserve all Bytes while also allowing String and RegExp operations.
   this.socket.setEncoding('binary');
   this.socket.setKeepAlive(true, 15000);
   this.socketEvents.on('data', data => {
    const backtrack = Math.min(2, this.bufferedData.length);
    // Backtrack determines how many characters from the end of bufferedData to include in text processing.
    // It should be one less than the largest sequence that may be encountered (e.g. IAC sequence is 3 Bytes so backtracking 2 Bytes will suffice).
    // This is to avoid performing text processing on buffered data that has already been processed once.
    if (backtrack > 0) data = `${this.bufferedData.slice(-backtrack)}${data}`;
    // Text processing:
    // 1. Handle IAC.
    // 2. Filter low non-printables except ESC (27), LF (10), CR (13), and HT (9). We need ESC for ANSI sequences.
    // 3. Split data into lines regardless of EOL format, even invalid \n\r which apparently some awful clients use.
    // (data MUST be binary encoded String)
    data = data.replace(/\xff[\xf0-\xff]./gs, iac => (this.iacHandle(iac) || ''))
     .replace(/[^\n\r\t\x1b\x20-\xff]/g, '')
     .split(
      this.telnetOptions.eor ? (
       /(?:\r\n|\n\r|\r|\n|\xff\xef)/
      ) : (
       /(?:\r\n|\n\r|\r|\n)/
      )
     );
    if (this.bufferedData.length > backtrack) data[0] = `${this.bufferedData.slice(0, -backtrack)}${data[0]}`;
    this.bufferedData = data[data.length - 1];
    if (this.config.bufferTTL > 0) {
     // Using bufferTTL (time to live) to determine how long to wait before flushing the buffer if no end of line/record has been received.
     if (this.bufferedData && !this.bufferedData.startsWith('#$#')) {
      this.timers.setTimeout('bufferFlush', this.config.bufferTTL, () => {
       if (this.bufferedData && this.socketEvents) this.socketEvents.emit('data', "\n");
      });
     }
     else this.timers.delete('bufferFlush');
    }
    if (data.length > 1) this.read({ device: this, lines: data.slice(0, -1) });
    else if (this.bufferedData.length > this.maxLineLength) {
     exports.log(`${this.title()} exceeded the max line length of ${this.maxLineLength} characters.`);
     this.close('Max line length exceeded');
    }
   });
  }
  unsetSocket(destroy = false) {
   // This method does not destroy the socket itself unless the first argument is true.
   this.events.emitBinaryState('ready', 'notReady');
   if (this.socketEvents) {
    this.socketEvents.close();
    this.socketEvents = undefined;
   }
   if (this.socket) {
    if (destroy) {
     if (!this.socket.destroyed) this.socket.destroy();
     this.socket.unref();
    }
    this.socket = undefined;
   }
  }

  setReadPipe(...devices) {
   devices.forEach(device => {
    device.pipesFrom.add(this);
    this.readPipes.add(device);
   });
  }
  unsetReadPipe(...devices) {
   devices.forEach(device => {
    if (!this.writePipes.has(device)) {
     device.pipesFrom.delete(this);
     device.ignore.delete(this);
    }
    this.readPipes.delete(device);
   });
  }

  setWritePipe(...devices) {
   devices.forEach(device => {
    device.pipesFrom.add(this);
    this.writePipes.add(device);
   });
  }
  unsetWritePipe(...devices) {
   devices.forEach(device => {
    if (!this.readPipes.has(device)) {
     device.pipesFrom.delete(this);
     device.ignore.delete(this);
    }
    this.writePipes.delete(device);
   });
  }

  setLabel(label) { this.label = label; }
  unsetLabel() { this.label = undefined; }

  setReadLogger(...loggers) { loggers.forEach(logger => this.readLoggers.add(logger)); }
  unsetReadLogger(...loggers) { loggers.forEach(logger => this.readLoggers.delete(logger)); }
  setWriteLogger(...loggers) { loggers.forEach(logger => this.writeLoggers.add(logger)); }
  unsetWriteLogger(...loggers) { loggers.forEach(logger => this.writeLoggers.delete(logger)); }

  getCurrentLoggerName() {
   return (this.currentLoggerName
    || (this.session && this.session.data.options.defaultLogger.name)
    || exports.config.defaultLogger.name
    || ''
   );
  }

  setMiddleware(middleware) {
   if (this.middleware) throw new Error(`${this.title()} has middleware already.`);
   middleware.device = this;
   this.middleware = middleware;
  }
  unsetMiddleware() {
   if (!this.middleware) return;
   this.middleware.device = undefined;
   this.middleware = undefined;
  }

  setDatabase(db) {
   if (this.db) this.unsetDatabase();
   if (db.initializing) {
    return db.initializing.then(val => {
     if (!this.destroyed) {
      if (this.db) this.unsetDatabase();
      db.link(this);
     }
     return val;
    });
   }
   else db.link(this);
  }
  unsetDatabase() {
   if (this.db) this.db.unlink(this);
  }

  setSession(session) {
   if (this.session) throw new Error(`${this.title()} is assigned to a Session already.`);
   this.session = session;
  }
  unsetSession() {
   if (this.session) {
    // Completely disconnecting this device from all devices associated with the session.
    [this.session.clients, this.session.servers].forEach(devices => {
     devices.forEach(device => {
      device.unsetReadPipe(this);
      device.unsetWritePipe(this);
      this.unsetReadPipe(device);
      this.unsetWritePipe(device);
     });
    });
   }
   this.session = undefined;
  }

  iacHandle(iac) {
   // Telnet Protocol, RFC 854:
   // https://tools.ietf.org/html/rfc854

   // Dec Hex Name
   // 251 FB  WILL
   // 252 FC  WONT
   // 253 FD  DO
   // 254 FE  DONT

   const record = {
    received: iac,
    sent: '',
    time: new Date(),
    action: '',
   };
   if (this.config.maxIACHistoryLength > 0) {
    const historyOverflow = this.iacHistory.push(record) - this.config.maxIACHistoryLength;
    if (historyOverflow > 0) this.iacHistory.splice(0, historyOverflow);
   }
   if (iac.length === 3 && iac[0] === "\xff") {
    if (iac[1] === "\xfb" || iac[1] === "\xfd") {
     // IAC WILL or DO something
     if (iac === "\xff\xfb\x19") {
      // IAC WILL TELOPT_EOR
      // 255 251  25
      record.action = 'accept';
      this.telnetOptions.eor = true;
     }
     else record.action = 'reject';
     if (record.action && this.socket) {
      if (record.action === 'reject') this.socket.write(record.sent = `\xff${iac[1] === "\xfb" ? "\xfe" : "\xfc"}${iac[2]}`, 'binary');
      else if (record.action === 'accept') this.socket.write(record.sent = `\xff${iac[1] === "\xfb" ? "\xfd" : "\xfb"}${iac[2]}`, 'binary');
     }
    }
    else if (iac[1] === "\xfc" || iac[1] === "\xfe") {
     // IAC WONT or DONT something
     if (iac === "\xff\xfc\x19") {
      // IAC WONT TELOPT_EOR
      // 255 252  25
      this.telnetOptions.eor = false;
     }
    }
   }
  }

  read({ device, lines, skipMiddleware, noForwarding }) {
   // The device is the source, i.e. where the data came from.
   // This method may be called for two reasons:
   // - There's incoming data from this.socket.
   // - Another device submits data as if it came from this.socket.
   // Either way, here middleware will be processed as client or server depending on this.isClient().
   if (this.destroyed || device.destroyed) return;
   lines.forEach(line => {
    const time = new Date();
    const options = { noForwarding };
    const lines = (this.middleware && !skipMiddleware) ? this.middleware.action({ device, line, options, triggers: this.middleware[this.isClient() ? 'clientTriggers' : 'serverTriggers'] }).lines : [line];
    if (device !== this && this.socket && this.isClient()) lines.forEach(line => this.socket.write(`${line}${this.config.eol}`, 'binary'));
    if (options.executed === undefined && this.isClient() && !line.startsWith('#$#') && !this.hasActiveServers()) {
     if (!this.session) device.tell(`Please use the CONNECT command to log in to a session.`);
     else if (this.session.servers.size === 0) device.tell(`This session has no server connections added. Please see MX HELP CA for information about how to add a connection.`);
     else {
      const servers = this.getServers();
      if (servers.length === 0) device.tell(`You are not set to transmit to a server.`);
      else if (servers.length === 1) device.tell(`${servers[0].name || servers[0].title()} is not connected.`);
      else device.tell(`${exports.utils.englishList(servers.map(server => server.name || server.title()).sort())} are not connected.`);
     }
    }
    if (!options.noForwarding) this.readPipes.forEach(d => d.pipe({ device, line, lines, options, operation: 'read' }));
    if (this.config.maxReadHistoryLength > 0) {
     const historyOverflow = this.readHistory.push({ device, line, lines, options, time }) - this.config.maxReadHistoryLength;
     if (historyOverflow > 0) this.readHistory.splice(0, historyOverflow);
    }
    else if (this.readHistory.length > 0) this.readHistory.length = 0;
    this.readLoggers.forEach(logger => {
     if (logger.destroyed) this.unsetReadLogger(logger);
     else logger.write({ device, line, lines, options, operation: 'read' });
    });
   });
  }

  write({ device, lines, skipMiddleware, noForwarding }) {
   // The device is the source, i.e. where the data came from.
   // This method is called whenever something wants to send data to this.socket.
   // Both readPipes and writePipes end up here.
   // Here middleware will use client or server triggers depending on device.isClient() (not this.isClient()).
   // Middleware will also be skipped if this.isClient() === device.isClient().
   if (this.destroyed || device.destroyed) return;
   if (this.socket && this.socket.authorized === false && !this.tlsAuthorizeOverride && !this.isClient()) {
    if (this.name && device.isClient() && lines.some(line => typeof line === 'string' && !line.startsWith('#$#'))) {
     device.tell([
      `Your message was blocked because there is a problem with the TLS certificate from ${this.name}.`,
      `TLS authorization error: ${this.socket.authorizationError}`,
      `If you trust the connection and wish to unblock it, then you can override this safety feature by typing: mx permit ${this.name}`,
     ]);
    }
    return;
   }
   lines.forEach(line => {
    const time = new Date();
    const options = { noForwarding };
    const lines = ((this.middleware && !skipMiddleware && this.isClient() !== device.isClient())
     ? this.middleware.action({ device, line, options, triggers: this.middleware[device.isClient() ? 'clientTriggers' : 'serverTriggers'] }).lines
     : [line]
    );
    if (this.socket && (!options.clientsOnly || this.isClient())) {
     lines.forEach(line => this.socket.write(`${this.config.ascii ? exports.utils.unidecode(line) : line}${this.config.eol}`, 'binary'));
    }
    if (!options.noForwarding) this.writePipes.forEach(d => d.pipe({ device, line, lines, options, operation: 'write' }));
    if (this.config.maxWriteHistoryLength > 0) {
     const historyOverflow = this.writeHistory.push({ device, line, lines, options, time }) - this.config.maxWriteHistoryLength;
     if (historyOverflow > 0) this.writeHistory.splice(0, historyOverflow);
    }
    else if (this.writeHistory.length > 0) this.writeHistory.length = 0;
    this.writeLoggers.forEach(logger => {
     if (logger.destroyed) this.unsetWriteLogger(logger);
     else logger.write({ device, line, lines, options, operation: 'write' });
    });
   });
  }

  stringifyObjects(objects) {
   if (objects.length === 0) return [''];
   else return objects.map(object => exports.utils.stringify(object)).join(' ').split(/(\r\n|\r|\n)/);
  }

  isActive() { return Boolean(this.socket && !this.socket.destroyed && !this.connectingTime && !this.reconnectingTime); }

  getClient(devices = this.readPipes) {
   for (let device of devices) {
    if (device.isClient()) return device;
   }
  }
  getActiveClient(devices = this.readPipes) {
   // An active client in this context means a client that is currently set to transmit to "this" device.
   for (let device of devices) {
    if (device.isClient() && device.readPipes.has(this)) return device;
   }
  }
  getClients(devices = this.readPipes) { return [...devices].filter(device => device.isClient()); }
  getActiveClients(devices = this.readPipes) { return [...devices].filter(device => device.isClient() && device.readPipes.has(this)); }
  hasClients() { return Boolean(this.getClient()); }
  hasActiveClients() { return Boolean(this.getActiveClient()); }

  getServer(devices = this.readPipes) {
   for (let device of devices) {
    if (!device.isClient()) return device;
   }
  }
  getActiveServer(devices = this.readPipes) {
   for (let device of devices) {
    if (!device.isClient() && device.isActive()) return device;
   }
  }
  getServers(devices = this.readPipes) { return [...devices].filter(device => !device.isClient()); }
  getActiveServers(devices = this.readPipes) { return [...devices].filter(device => !device.isClient() && device.isActive()); }
  hasServers() { return Boolean(this.getServer()); }
  hasActiveServers() { return Boolean(this.getActiveServer()); }

  pipe({ device, line, lines, operation, options }) {
   if (lines.length > 0) {
    if (this.ignore.has(device) && (this.gagMode !== 'hybrid' || !this.readPipes.has(device))) return;
    if (options.clientsOnly !== true || this.isClient()) this.write({ device, lines, skipMiddleware: operation === 'write' });
   }
  }

  update() {
   return;
  }
 }

 exports.Device = Device;
};
