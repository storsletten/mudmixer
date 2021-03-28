module.exports = main => {
 const exports = main.exports;

 class Middleware {
  constructor(options = {}) {
   this.actions = new Set();
   this.clientTriggers = new exports.ClientTriggers({ middleware: this });
   this.serverTriggers = new exports.ServerTriggers({ middleware: this });
   this.messages = {
    commandAborted: `>> Command Aborted <<`,
    confirm: `[Enter "yes" or "no"]`,
    invalidSelection: `Invalid selection.`,
    multilinePrompt: `[Type lines of input; use \`.' to end.]`,
    prompt: `[Type a line of input or \`@abort' to abort the command.]`,
   };
   this.packages = new Map();
   this.data = {};
   this.status = 'enabled';
   this.set(options);
  }

  close(reason) {
   if (this.destroyed) return;
   this.destroyed = true;
   this.status = 'closed';
   this.unset();
  }

  title() {
   return `${this.device ? this.device.title() : 'Unlinked'} middleware`;
  }

  set(options = {}) {
   if (options.device) this.setDevice(options.device);
   if (options.data) Object.assign(this.data, options.data);
   if (options.messages) this.setMessages(options.messages);
   if (options.status) this.setStatus(options.status);
   if (options.label) this.setLabel(options.label);
  }
  unset() {
   this.actions.forEach(action => action.reject(null));
   this.clearTriggers();
   this.packages.clear();
   this.unsetDevice();
   this.data = {};
  }

  setStatus(status) {
   this.status = status;
  }
  setLabel(label) {
   this.label = label;
  }

  setDevice(device) {
   if (this.device) this.unsetDevice();
   device.setMiddleware(this);
  }
  unsetDevice() {
   if (this.device) {
    if (this.device.middleware === this) this.device.unsetMiddleware();
    else {
     exports.log(`Warning: Middleware integrity check failed for ${this.title()}.`);
     this.device = undefined;
    }
   }
  }

  setMessages(messages) {
   Object.assign(this.messages, messages);
  }

  setGenericTrigger({ triggers, type, trigger, action, packageName }) { return triggers.setTrigger({ type, trigger, action, packageName: packageName || this.loadingPackage }); }
  unsetGenericTrigger({ triggers, type, trigger, packageName }) { return triggers.unsetTrigger({ type, trigger, packageName: packageName || this.loadingPackage }); }

  setTrigger(type, trigger, action) { return this.setGenericTrigger({ triggers: this.clientTriggers, type, trigger, action }); }
  unsetTrigger(type, trigger) { return this.unsetGenericTrigger({ triggers: this.clientTriggers, type, trigger }); }
  setServerTrigger(type, trigger, action) { return this.setGenericTrigger({ triggers: this.serverTriggers, type, trigger, action }); }
  unsetServerTrigger(type, trigger) { return this.unsetGenericTrigger({ triggers: this.serverTriggers, type, trigger }); }

  setCommand(cmd, action) { return this.setGenericTrigger({ triggers: this.clientTriggers, type: 'cmd', trigger: cmd, action }); }
  unsetCommand(cmd) { return this.unsetGenericTrigger({ triggers: this.clientTriggers, type: 'cmd', trigger: cmd }); }
  setServerCommand(cmd, action) { return this.setGenericTrigger({ triggers: this.serverTriggers, type: 'cmd', trigger: cmd, action }); }
  unsetServerCommand(cmd) { return this.unsetGenericTrigger({ triggers: this.serverTriggers, type: 'cmd', trigger: cmd }); }

  setInterceptor(action) { return this.setGenericTrigger({ triggers: this.clientTriggers, type: 'interceptor', action }); }
  unsetInterceptor() { return this.unsetGenericTrigger({ triggers: this.clientTriggers, type: 'interceptor' }); }
  setServerInterceptor(action) { return this.setGenericTrigger({ triggers: this.serverTriggers, type: 'interceptor', action }); }
  unsetServerInterceptor() { return this.unsetGenericTrigger({ triggers: this.serverTriggers, type: 'interceptor' }); }

  clearTriggers(packageName) {
   [this.clientTriggers, this.serverTriggers].forEach(triggers => {
    if (packageName) triggers.clearPackage(packageName);
    else triggers.clearAll();
   });
  }

  async loadPackage(name, path) {
   if (this.destroyed) return;
   else if (this.loadingPackage) throw new Error(`${this.title()} is already loading ${this.loadingPackage}.`);
   else if (!name) throw new Error(`Cannot load a middleware package without a name.`);
   else if (this.packages.has(name)) throw new Error(`${this.title()} has a package named ${name} already.`);
   if (!path) {
    path = await exports.getMiddlewarePackagePath(name);
    if (!path) throw new Error(`Found no middleware package named ${name}.`);
   }
   const resolvedPath = require.resolve(path);
   this.loadingPackage = name;
   try {
    await require(resolvedPath)(main, this);
    this.packages.set(name, resolvedPath);
    return true;
   }
   catch (error) { exports.log(`${this.title()} failed to load package ${name}:`, error); }
   finally { this.loadingPackage = undefined; }
  }
  async loadPackages(packages) {
   for (let [name, path] of packages) await this.loadPackage(name, path);
  }

  async reloadPackage(name) {
   if (this.destroyed) return;
   else if (!this.packages.has(name)) throw new Error(`${this.title()} has no package named ${name} to reload.`);
   const path = this.packages.get(name);
   this.clearTriggers(name);
   this.loadingPackage = name;
   try {
    await require(path)(main, this);
    return true;
   }
   catch (error) { exports.log(`${this.title()} failed to reload package ${name}:`, error); }
   finally { this.loadingPackage = undefined; }
  }
  async reloadPackages(names) {
   for (let name of (names ? (names instanceof Map ? names.keys() : names) : this.packages.keys())) await this.reloadPackage(name);
  }
  async reload() {
   await this.reloadPackages(this.packages);
  }

  unloadPackage(name) {
   if (this.destroyed) return;
   else if (!this.packages.has(name)) throw new Error(`${this.title()} has no package named ${name} to unload.`);
   this.clearTriggers(name);
   return this.packages.delete(name);
  }
  unloadPackages(names) {
   for (let name of (names ? (names instanceof Map ? names.keys() : names) : this.packages.keys())) this.unloadPackage(name);
  }
  unload() {
   this.unloadPackages(this.packages);
  }

  update() {
   exports.utils.changePrototypeOf(this, exports.Middleware.prototype);
   this.clientTriggers.update();
   this.serverTriggers.update();
  }

  execute(args) {
   if (!args.options.executed) args.options.executed = [];
   try {
    if (args.action instanceof exports.Action) args.action.execute(args);
    else args.action(args);
    args.options.executed.push(args);
   }
   catch (error) {
    exports.log(`Middleware execution error in ${this.title()}:`, error);
    if (args.lines instanceof exports.utils.ChainableArray) args.lines.clear();
    args.options.executed.push({ ...args, error });
   }
  }

  action(args) {
   const { device, line, triggers, options } = args;
   if (!(args.lines instanceof exports.utils.ChainableArray)) args.lines = new exports.utils.ChainableArray(line);
   // Manipulate args.lines to control what will be forwarded to logs and other devices after the middleware action is complete.
   // Use args.device.tell() to send line (string) or lines (array) to the package device (i.e. the device that this call originated from).
   if (this.status !== 'enabled') return args;
   args.middleware = this;
   args.isOOB = line.startsWith('#$#');
   if (!args.isOOB) {
    const interceptor = triggers.getType('interceptor');
    if (interceptor) {
     // The interceptor may be unset automatically (see conditions below).
     // And options.clientsOnly is true by default for interceptors.
     options.clientsOnly = true;
     this.execute({ ...args, ...interceptor, type: 'interceptor' });
     if (!(interceptor.action instanceof exports.Action)) {
      // Excluding actions from being auto unset since they have their own mechanism for removal when settling.
      // Before unsetting, make sure the interceptor has not already been replaced by a new interceptor, and honor options.keepInterceptor.
      if (triggers.getType('interceptor') === interceptor && options.keepInterceptor !== true) this.unsetInterceptor();
     }
     if (options.continue) options.continue = undefined;
     else return args;
    }
   }
   // Functions.
   for (let [name, data] of triggers.getType('fn')) {
    this.execute({ ...args, ...data, type: 'fn' });
    if (options.continue) options.continue = undefined;
    else return args;
   }
   // Case-sensitive triggers.
   const csFound = triggers.getType('cs').get(line);
   if (csFound) {
    this.execute({ ...args, ...csFound, type: 'cs' });
    if (options.continue) options.continue = undefined;
    else return args;
   }
   // Case-insensitive triggers.
   const lcLine = line.toLowerCase();
   const ciFound = triggers.getType('ci').get(lcLine);
   if (ciFound) {
    this.execute({ ...args, ...ciFound, type: 'ci', lcLine });
    if (options.continue) options.continue = undefined;
    else return args;
   }
   // Case-insensitive commands (verbs).
   const commands = triggers.getType('cmd');
   if (commands.size > 0) {
    const lcCommand = lcLine.trimStart().split(' ', 1)[0];
    const cmdFound = lcCommand && commands.get(lcCommand);
    if (cmdFound) {
     // options.clientsOnly is true by default for client commands.
     // options.noForwarding is true by default for server commands.
     if (device.isClient()) options.clientsOnly = true;
     else options.noForwarding = true;
     const argstr = line.replace(/^\s*[^\s]+\s*/, '');
     const parsedArgs = exports.utils.parseArgstr(argstr);
     this.execute({ ...args, ...cmdFound, type: 'cmd', lcCommand, lcLine, argstr, args: parsedArgs });
     if (options.continue) options.continue = undefined;
     else return args;
    }
   }
   // RegExp triggers.
   for (let [regexp, data] of triggers.getType('re')) {
    const match = line.match(regexp);
    if (match) {
     this.execute({ ...args, ...data, type: 're', match });
     if (options.continue) options.continue = undefined;
     else return args;
    }
   }
   if (!args.isOOB && !options.executed) {
    const lineWithoutANSI = line.replace(/(\x9b|\x1b\[)[0-?]*[ -\/]*[@-~]/g, '');
    if (line !== lineWithoutANSI) {
     // Give it another try without ANSI escape sequences.
     args.line = lineWithoutANSI;
     args.ansiLine = line;
     args.lineWithoutANSI = lineWithoutANSI;
     args = this.action(args);
     args.line = line;
    }
   }
   return args;
  }

  // Component shortcuts
  confirm(options = {}) { return this.setInterceptor(new exports.Confirm({ ...(exports.utils.isRegularObject(options) ? options : { message: options }), middleware: this, device: this.device })).action.promise; }
  localEdit(options) { return (new exports.LocalEdit({ middleware: this, device: this.device, ...options })).promise; }
  loginPrompt(options = {}) { return this.setInterceptor(new exports.LoginPrompt({ ...(exports.utils.isRegularObject(options) ? options : { message: options }), middleware: this, device: this.device })).action.promise; }
  menu(options) { return this.setInterceptor(new exports.Menu({ ...(exports.utils.isRegularObject(options) ? options : { choices: (Array.isArray(options) ? options : [options]) }), middleware: this, device: this.device })).action.promise; }
  optionsMenu(options) { return exports.optionsMenu({ device: this.device, ...options, middleware: this }); }
  prompt(options = {}) { return this.setInterceptor(new exports.Prompt({ ...(exports.utils.isRegularObject(options) ? options : { message: options }), middleware: this, device: this.device })).action.promise; }
  selectServer(options) { return exports.selectServer({ device: this.device, ...options, middleware: this }); }
  suspend(time) { return (new exports.Suspend({ middleware: this, device: this.device, time })).promise; }
 }

 exports.Middleware = Middleware;
};
