const fs = require('fs');
const path = require('path');

module.exports = main => {
 const exports = main.exports;

 // The following check can probably be safely removed during the summer of 2021:
 if (!exports.databases) exports.databases = new Map();

 class Database {
  constructor(options) {
   this.setName(options.name);
   this.destroyed = false;
   this.devices = new Set();
   this.data = {};
   this.lastSnapshot = undefined;
   const initializing = this.initializing = this.fetch().finally(() => {
    if (initializing === this.initializing) this.initializing = undefined;
   });
  }

  close() {
   if (this.destroyed) return;
   this.destroyed = true;
   this.devices.forEach(device => this.unlink(device));
   if (this.name) exports.databases.delete(this.name.toLowerCase());
  }

  setName(newName) {
   if (!newName) throw new Error(`Database must have a name.`);
   const lcNewName = newName.toLowerCase();
   if (this.name) this.unsetName();
   if (exports.databases.has(lcNewName)) throw new Error(`There is already a database named ${lcNewName}.`);
   exports.databases.set(lcNewName, this);
   this.name = newName;
  }
  unsetName() {
   if (this.name) {
    const lcOldName = this.name.toLowerCase();
    exports.databases.delete(lcOldName);
    this.name = undefined;
   }
  }

  getPath() {
   return exports.dataPath('databases', `${this.name.toLowerCase()}.json`);
  }

  link(device) {
   if (this.destroyed) return;
   if (device.db !== this) {
    if (device.db) device.unsetDatabase();
    device.db = this;
    this.devices.add(device);
   }
  }
  unlink(device) {
   this.devices.delete(device);
   if (device.db === this) device.db = undefined;
  }

  async fetch() {
   const filePath = this.getPath();
   const baseName = path.basename(filePath);
   try {
    const data = await fs.promises.readFile(filePath, { encoding: 'binary' });
    const parsedData = JSON.parse(data);
    if (!exports.utils.isRegularObject(parsedData)) throw new Error(`The data is not a regular object.`);
    exports.utils.pruneRegularObject(this.data, parsedData, { fix: true });
    exports.utils.mergeRegularObject(this.data, parsedData, { overwrite: true });
    this.lastSnapshot = data;
    return true;
   }
   catch (error) {
    exports.log(`Couldn't read database file ${exports.utils.formatPath(filePath)}.`, error);
    return false;
   }
  }

  async store() {
   const filePath = this.getPath();
   const dirName = path.dirname(filePath);
   const baseName = path.basename(filePath);
   const data = JSON.stringify(this.data, null, 1);
   if (data === this.lastSnapshot) return;
   const watcher = exports.directoryWatchers.get(dirName);
   const fileIgnored = watcher && watcher.ignoreFile({ name: baseName });
   try {
    await fs.promises.writeFile(filePath, data, { encoding: 'binary' });
    exports.log(`Stored database ${this.name || ''} (${exports.utils.formatThousands(data.length)} Bytes written).`);
    this.lastSnapshot = data;
    return true;
   }
   catch (error) {
    exports.log(`Couldn't store database ${exports.utils.formatPath(filePath)}.`, error);
    return false;
   }
   finally {
    if (fileIgnored) watcher.unignoreFile({ name: baseName });
   }
  }

  storeSync() {
   // This method enables process 'exit' event to store data.
   const filePath = this.getPath();
   const dirName = path.dirname(filePath);
   const baseName = path.basename(filePath);
   const data = JSON.stringify(this.data, null, 1);
   if (data === this.lastSnapshot) return;
   const watcher = exports.directoryWatchers.get(dirName);
   const fileIgnored = watcher && watcher.ignoreFile({ name: baseName });
   try {
    fs.writeFileSync(filePath, data, { encoding: 'binary' });
    exports.log(`Stored database ${this.name || ''} (${exports.utils.formatThousands(data.length)} Bytes written).`);
    this.lastSnapshot = data;
    return true;
   }
   catch (error) {
    exports.log(`Couldn't store database ${exports.utils.formatPath(filePath)}.`, error);
    return false;
   }
   finally {
    if (fileIgnored) watcher.unignoreFile({ name: baseName });
   }
  }

  update() {
   exports.utils.changePrototypeOf(this, exports.Database.prototype);
  }
 }

 exports.Database = Database;
};
