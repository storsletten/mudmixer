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
   this.iacBuffer = [];
   this.lineBuffer = [];
   this.ignoreNextLineTerminator = undefined;
   this.readHistory = [];
   this.writeHistory = [];
   this.iacHistory = [];
   this.iacSubNegotiation = undefined;
   this.telnetOptions = {
    eor: false, // End of Record
    gmcp: false, // Generic MUD Communication Protocol
    mssp: false, // MUD Server Status Protocol
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
   if (this.iacBuffer.length > 0) this.iacBuffer.length = 0;
   if (this.lineBuffer.length > 0) this.lineBuffer.length = 0;
   if (this.mcp) this.mcp = undefined;
   this.socketEvents = new exports.utils.Events(socket);
   // Using binary (latin1) encoding to preserve all Bytes while also allowing String and RegExp operations.
   this.socket.setEncoding('binary');
   this.socket.setKeepAlive(true, 15000);
   this.socketEvents.on('data', data => this.dataHandle(data));
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

  dataHandle(data) {
   data = data.split(/([\n|\r|\xff])/);
   for (let i=0; i<data.length; i++) {
    if (data[i] === '') continue;
    if (this.iacBuffer.length !== 0) {
     if (this.iacBuffer.length === 1) {
      const command = data[i].charCodeAt(0);
      if (command === 255) {
       this.iacBuffer.length = 0;
       this.lineBuffer.push(data[i]);
       continue;
      }
      else {
       this.iacBuffer.push(data[i][0]);
       if (command < 250) this.iacHandle(this.iacBuffer.splice(0, this.iacBuffer.length).join(''));
       if (data[i].length === 1) continue;
       data[i] = data[i].slice(1);
      }
     }
     if (this.iacBuffer.length > 1) {
      const command = this.iacBuffer[1].charCodeAt(0);
      if (command === 250) {
       // Subnegotiation
       // This code assumes that subnegotiations will not be nested.
       if (this.iacBuffer[this.iacBuffer.length - 1] === "\xff") {
        if (data[i][0] === "\xf0") {
         // Subnegotiation End
         this.iacHandle(this.iacBuffer.splice(0, this.iacBuffer.length).join('') + "\xf0");
         if (data[i].length === 1) continue;
         data[i] = data[i].slice(1);
        }
        else if (data[i][0] === "\xff") {
         this.iacBuffer.push('');
         if (data[i].length === 1) continue;
         data[i] = data[i].slice(1);
        }
        else {
         this.iacBuffer.push(data[i]);
         continue;
        }
       }
       else {
        this.iacBuffer.push(data[i]);
        continue;
       }
      }
      else if (command > 250) {
       // WILL / WONT / DO / DONT
       this.iacHandle(this.iacBuffer.splice(0, this.iacBuffer.length).join('') + data[i][0]);
       if (data[i].length === 1) continue;
       data[i] = data[i].slice(1);
      }
      else {
       // Who knows
       this.iacHandle(this.iacBuffer.splice(0, this.iacBuffer.length).join(''));
      }
     }
    }
    if (data[i].length === 1) {
     const byte = data[i];
     if (byte === "\n" || byte === "\r") {
      if (byte === this.ignoreNextLineTerminator) this.ignoreNextLineTerminator = undefined;
      else { 
       this.ignoreNextLineTerminator = (byte === "\n" ? "\r" : "\n");
       this.read();
      }
      continue;
     }
     else if (byte === "\xff") {
      this.iacBuffer.push(byte);
      continue;
     }
    }
    this.lineBuffer.push(data[i]);
   }
   if (this.config.bufferTTL > 0 && this.iacBuffer.length === 0 && this.lineBuffer.length !== 0) {
    // Conditionally use bufferTTL (time to live) to determine how long to wait before flushing the lineBuffer if no end of line/record has been received.
    // This is because some MUDs don't terminate their prompts properly.
    let strBuffer = this.lineBuffer[0];
    for (let i=1; i<this.lineBuffer.length; i++) {
     // If the buffer is larger than 1000, then it's probably not a prompt:
     if (strBuffer.length > 1000) {
      strBuffer = '';
      break;
     }
     else strBuffer += this.lineBuffer[i];
    }
    // It is not a prompt if it's an OOB message:
    if (strBuffer && !strBuffer.startsWith('#$#')) {
     this.timers.setTimeout('bufferFlush', this.config.bufferTTL, () => {
      if (this.lineBuffer.length !== 0 && !this.destroyed) this.read();
     });
     return;
    }
   }
   this.timers.delete('bufferFlush');
  }

  iacSend(iac) {
   const record = {
    sent: iac,
    time: new Date(),
   };
   if (this.config.maxIACHistoryLength > 0) {
    const historyOverflow = this.iacHistory.push(record) - this.config.maxIACHistoryLength;
    if (historyOverflow > 0) this.iacHistory.splice(0, historyOverflow);
   }
   if (this.socket) this.socket.write(iac, 'binary');
  }

  iacHandle(iac) {
   // Telnet Protocol, RFC 854:
   // https://tools.ietf.org/html/rfc854

   const record = {
    action: undefined,
    received: iac,
    time: new Date(),
   };
   if (this.config.maxIACHistoryLength > 0) {
    const historyOverflow = this.iacHistory.push(record) - this.config.maxIACHistoryLength;
    if (historyOverflow > 0) this.iacHistory.splice(0, historyOverflow);
   }
   if (iac.length < 2) throw new Error(`No IAC command is less than 2 Bytes.`);
   else if (iac.length === 2) {
    if (iac[1] === "\xef") {
     // End of Record
     if (this.telnetOptions.eor && this.lineBuffer.length > 0) this.read();
    }
    else if (iac[1] === "\xf9") {
     // IAC GA
     if (this.lineBuffer.length > 0) this.read();
    }
   }
   else if (iac.length === 3) {
    if (iac[1] === "\xfb" || iac[1] === "\xfd") {
     // IAC WILL or DO something
     if (iac === "\xff\xfb\x19") {
      // IAC WILL TELOPT_EOR
      // 255 251  25
      record.action = 'accept';
      this.telnetOptions.eor = true;
     }
     else if (iac === "\xff\xfb\x46") {
      // IAC WILL MSSP
      // 255 251  70
      record.action = 'accept';
      this.telnetOptions.mssp = true;
     }
     else if (iac === "\xff\xfd\x46" && this.isClient() && this.session) {
      // IAC DO  MSSP
      // 255 253 70
      this.telnetOptions.mssp = true;
     }
     else if (iac === "\xff\xfb\xc9") {
      // IAC WILL GMCP
      // 255 251  201
      record.action = 'accept';
      this.telnetOptions.gmcp = true;
     }
     else if (iac === "\xff\xfd\xc9" && this.isClient() && this.session) {
      // IAC DO  GMCP
      // 255 253 201
      this.telnetOptions.gmcp = true;
     }
     else record.action = 'reject';
     if (record.action) {
      if (record.action === 'reject') this.iacSend(`\xff${iac[1] === "\xfb" ? "\xfe" : "\xfc"}${iac[2]}`);
      else if (record.action === 'accept') this.iacSend(`\xff${iac[1] === "\xfb" ? "\xfd" : "\xfb"}${iac[2]}`);
     }
    }
    else if (iac[1] === "\xfc" || iac[1] === "\xfe") {
     // IAC WONT or DONT something
     if (iac === "\xff\xfc\x19") {
      // IAC WONT TELOPT_EOR
      // 255 252  25
      this.telnetOptions.eor = false;
     }
     else if (iac === "\xff\xfc\xc9") {
      // IAC WONT GMCP
      // 255 252  201
      this.telnetOptions.gmcp = false;
     }
    }
   }
   else {
    if (iac[1] === "\xfa") {
     // IAC Subnegotiation
     if (!iac.endsWith("\xff\xf0")) throw new Error(`IAC Subnegotiation was not terminated properly`);
     const data = iac.slice(3, -2);
     if (iac[2] === "\x46") {
      // MSSP
      this.mssp = data.split("\x01").slice(1).reduce((mssp, data) => {
       const [ name, value ] = data.split("\x02");
       if (value.match(/^\d{1,11}(?:\.\d{1,11})?$/)) mssp[name] = Number(value);
       else mssp[name] = value;
       return mssp;
      }, {});
     }
    }
   }
  }

  read({
   device = this,
   lines = [this.lineBuffer.splice(0, this.lineBuffer.length).join('')],
   skipMiddleware = false,
   noForwarding = false,
  } = {}) {
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
    if (device !== this && this.socket && this.isClient()) lines.forEach(line => this.socket.write(`${line.replace(/\xff/g, "\xff\xff")}${this.config.eol}`, 'binary'));
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
     lines.forEach(line => this.socket.write(`${(this.config.ascii ? exports.utils.unidecode(line) : line).replace(/\xff/g, "\xff\xff")}${this.config.eol}`, 'binary'));
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
    if (this.ignore.has(device) && (this.config.gagMode !== 'hybrid' || !this.readPipes.has(device))) return;
    if (options.clientsOnly !== true || this.isClient()) this.write({ device, lines, skipMiddleware: operation === 'write' });
   }
  }

  update() {
   return;
  }
 }

 exports.Device = Device;
};
