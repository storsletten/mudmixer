const fs = require('fs');
const os = require('os');
const path = require('path');

module.exports = main => {
 const exports = main.exports;

 class Logger {
  constructor(options = {}) {
   this.eol = os.EOL;
   // The queue is used whenever the logger needs to fix directory structure etc without causing the caller to wait for writing to finish.
   this.queue = [];
   this.setName(options.name || '');
  }

  close() {
   if (this.destroyed) return;
   this.destroyed = true;
   if (this.writeStream) {
    this.writeStream.close();
    this.writeStream = undefined;
   }
   this.queue.length = 0;
   if (this.name !== undefined) {
    const lcName = this.name.toLowerCase();
    if (exports.loggers.get(lcName) === this) exports.loggers.delete(lcName);
   }
  }

  title() { return this.name ? `Logger ${this.name}` : 'Default Logger'; }

  setName(name) {
   if (this.busyTime) throw new Error(`Can't set a new name on this logger because it's currently busy with something.`);
   const newName = exports.utils.sanitizeFileName(name.trim());
   const oldName = this.name;
   if (oldName !== newName) {
    const lcNewName = newName.toLowerCase();
    if (exports.loggers.has(lcNewName)) throw new Error(`There is already a logger named ${newName}.`);
    if (oldName === undefined) {
     this.name = newName;
     exports.loggers.set(lcNewName, this);
     this.setConfig();
    }
    else {
     this.busyTime = new Date();
     const lcOldName = oldName.toLowerCase();
     return (async () => {
      try {
       if (this.destroyed) return;
       if (exports.loggers.has(lcNewName)) throw new Error(`There is already a logger named ${newName}.`);
       if (oldName && newName) {
        const { logsDir } = this.getCurrentPath();
        if (this.writeStream) {
         this.writeStream.close();
         this.writeStream = undefined;
        }
        await fs.promises.rename(path.join(logsDir, oldName), path.join(logsDir, newName));
        if (exports.loggers.has(lcNewName)) throw new Error(`There is already a logger named ${newName}.`);
       }
       if (exports.loggers.get(lcOldName) === this) exports.loggers.delete(lcOldName);
       this.name = newName;
       exports.loggers.set(lcNewName, this);
       this.setConfig();
      }
      finally { this.busyTime = undefined; }
      this.setup();
     })();
    }
   }
  }

  setConfig(config) {
   if (config) this.config = config;
   else {
    const lcName = this.name.toLowerCase();
    this.config = (exports.config.loggers.find(options => (
     exports.utils.isRegularObject(options)
     && typeof options.name === 'string'
     && options.name.toLowerCase() === lcName
    )) || exports.config.defaultLogger);
   }
   if (this.config !== exports.config.defaultLogger) {
    exports.utils.pruneRegularObject(this.config, exports.config.defaultLogger, { fix: true });
    exports.utils.mergeRegularObject(this.config, exports.config.defaultLogger);
   }
  }

  getCurrentPath() {
   const logsDir = exports.dataPath('logs');
   const time = this.setupTime;
   if (time) {
    const dirName = path.join(logsDir, (this.name || 'default').toLowerCase(), String(time.getFullYear()), String(time.getMonth() + 1));
    const baseName = `${exports.utils.englishOrdinalIndicator(time.getDate())} of ${exports.utils.englishMonths[time.getMonth()]} ${time.getFullYear()}.txt`;
    return { logsDir, dirName, baseName, filePath: path.join(dirName, baseName) };
   }
   else return { logsDir };
  }

  isNewDay() {
   const now = new Date();
   return (this.setupTime.getDate() !== now.getDate()
    || this.setupTime.getMonth() !== now.getMonth()
    || this.setupTime.getFullYear() !== now.getFullYear()
   );
  }

  setup() {
   if (this.busyTime) return;
   this.busyTime = new Date();
   return (async () => {
    try {
     if (this.writeStream) {
      this.writeStream.close();
      this.writeStream = undefined;
     }
     else if (this.destroyed) return;
     this.setupTime = new Date();
     const { dirName, filePath } = this.getCurrentPath();
     await fs.promises.mkdir(dirName, { recursive: true });
     if (this.destroyed) return;
     this.writeStream = await exports.utils.fs.createWriteStream(filePath, { encoding: 'binary', autoClose: true, flags: 'a' });
     if (this.destroyed) {
      this.writeStream.close();
      return this.writeStream = undefined;
     }
    }
    finally { this.busyTime = undefined; }
    if (this.queue.length > 0) {
     for (let args of this.queue) {
      if (!this.write(args)) break;
     }
     // Discard the queue after writing it to the stream.
     // If writing fails right after successfully creating the stream, then also discard everything.
     this.queue.length = 0;
    }
   })();
  }

  discardLine(line) {
   if (typeof line !== 'string') return true;
   if (this.config.filterOOB && line.startsWith('#$#')) return true;
  }
  formatLine(line) {
   if (this.config.filterANSIEscapeSequences) line = line.replace(/(\x9b|\x1b\[)[0-?]*[ -\/]*[@-~]/g, '');
   if (this.config.includeTimestamps) {
    const timestamp = (this.config.milliseconds ? exports.utils.formatTimeMS() : exports.utils.formatTime());
    if (this.lastTimestamp !== timestamp) {
     this.lastTimestamp = timestamp;
     return `${line}\t[${timestamp}]${this.eol}`;
    }
   }
   return `${line}${this.eol}`;
  }

  write(args) {
   if (this.destroyed) return;
   if (!this.busyTime) {
    if (this.writeStream && !this.isNewDay()) {
     const lines = (Array.isArray(args) ? args : (typeof args === 'object' ? args.lines : [args || '']));
     if (lines.length === 0 || lines.every(line => this.discardLine(line) || this.writeStream.write(this.formatLine(line)))) return true;
    }
    this.setup();
   }
   this.queue.push(args);
   return false;
  }

  update() {
   if (exports.Logger.prototype !== Object.getPrototypeOf(this)) {
    Object.setPrototypeOf(this, exports.Logger.prototype);
    this.lastUpdateTime = new Date();
   }
  }
 }

 exports.Logger = Logger;
};
