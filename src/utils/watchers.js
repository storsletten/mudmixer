const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Using SHA-256 of the content of a file to make sure it really has changed.
// This is because the watch API is notoriously unreliable, and may even fire off change events without the user's knowledge or consent.

module.exports = main => {
 const exports = main.exports;

 const watchDirectory = async (dirName) => {
  const resolvedPath = path.isAbsolute(dirName) ? dirName : exports.dataPath(dirName);
  const existingWatcher = exports.directoryWatchers.get(resolvedPath);
  if (existingWatcher) return existingWatcher;
  else {
   const stats = await fs.promises.stat(resolvedPath);
   const existingWatcher = exports.directoryWatchers.get(resolvedPath);
   if (existingWatcher) return existingWatcher;
   if (!stats.isDirectory()) throw new Error(`Not a directory: ${resolvedPath}`);
   return new DirectoryWatcher({ dirName: resolvedPath });
  }
 };

 class DirectoryWatcher {
  constructor({ dirName }) {
   if (exports.directoryWatchers.has(dirName)) throw new Error(`That file has a DirectoryWatcher already: ${dirName}`);
   exports.directoryWatchers.set(dirName, this);
   this.path = dirName;
   this.callbacks = new Map();
   this.files = new Map();
   this.start();
  }
  close() {
   if (exports.directoryWatchers.get(this.path) === this) exports.directoryWatchers.delete(this.path);
   this.stop();
   this.files.clear();
  }

  start() {
   if (this.fsWatcher) this.stop();
   const watcher = fs.watch(this.path, { persistent: false, recursive: false, encoding: 'binary' }, (...params) => this.onChange(...params));
   watcher.on('error', (...params) => this.onError(...params));
   watcher.on('close', (...params) => this.onClose(...params));
   this.fsWatcher = watcher;
  }
  stop() {
   if (!this.fsWatcher) return;
   this.setFilesPending();
   const watcher = this.fsWatcher;
   this.fsWatcher = undefined;
   watcher.close();
   watcher.removeAllListeners();
   watcher.unref();
  }

  setFilePending({ file, callback, delay, params = [] }) {
   if (file.pending) clearTimeout(file.pending);
   file.pending = (callback && this.fsWatcher && setTimeout(() => {
    file.pending = undefined;
    callback(...params);
   }, Math.max(delay || 0, 50)));
  }
  setFilesPending({ files, ...params } = {}) {
   if (files) {
    for (let file of files) this.setFilePending({ ...params, file });
   }
   else {
    for (let file of this.files.values()) this.setFilePending({ ...params, file });
   }
  }

  async watchFile({ name, callback, associatedWith }) {
   if (!name) throw new Error(`File name is missing.`);
   else if (!callback) throw new Error(`Callback is missing.`);
   const existingFile = this.files.get(name);
   if (existingFile) {
    if (associatedWith) {
     existingFile.callbacks.forEach((association, callback) => associatedWith === association && existingFile.callbacks.delete(callback));
    }
    existingFile.callbacks.set(callback, associatedWith);
   }
   else if (exports.utils.invalidFileName(name)) throw new Error(`Invalid file name.`);
   else {
    const filePath = path.join(this.path, name);
    const content = await fs.promises.readFile(filePath, { encoding: 'binary' });
    const existingFile = this.files.get(name);
    if (existingFile) existingFile.callbacks.set(callback, associatedWith);
    else {
     const hash = crypto.createHash('sha256').update(content).digest();
     const newFile = { pending: false, hash, size: content.length, callbacks: new Map([[callback, associatedWith]]) };
     this.files.set(name, newFile);
    }
   }
  }
  async watchFiles({ names, ...options }) {
   for (let name of names) await this.watchFile({ ...options, name });
  }

  addFileCallback({ name, callback, associatedWith }) {
   if (!callback) throw new Error(`Callback is missing.`);
   const existingFile = this.files.get(name);
   if (existingFile) existingFile.callbacks.set(callback, associatedWith);
  }
  addFilesCallback({ names, ...options }) {
   for (let name of names) this.addFileCallback({ ...options, name });
  }
  removeFile({ name }) {
   this.files.delete(name);
  }
  removeFiles({ names } = {}) {
   if (names) names.forEach(name => this.files.delete(name));
   else this.files.clear();
  }
  removeFileCallback({ name, callback }) {
   const existingFile = this.files.get(name);
   if (existingFile) existingFile.callbacks.delete(callback);
  }
  removeFileCallbacks({ name, associatedWith } = {}) {
   if (name) {
    const existingFile = this.files.get(name);
    if (!existingFile) return;
    if (associatedWith) existingFile.callbacks.forEach((a, callback) => a === associatedWith && existingFile.callbacks.delete(callback));
    else existingFile.callbacks.clear();
   }
   else {
    this.files.forEach(file => {
     if (associatedWith) file.callbacks.forEach((a, callback) => a === associatedWith && file.callbacks.delete(callback));
     else file.callbacks.clear();
    });
   }
  }
  pruneFileCallbacks() {
   this.files.forEach(file => {
    file.callbacks.forEach((associatedWith, callback) => {
     if (typeof associatedWith === 'object' && associatedWith.destroyed) file.callbacks.delete(callback);
    });
   });
  }
  ignoreFile({ name }) {
   const existingFile = this.files.get(name);
   if (existingFile) return existingFile.ignore = true;
   else return false;
  }
  ignoreFileOnce({ name }) {
   const existingFile = this.files.get(name);
   if (existingFile) return existingFile.ignoreOnce = true;
   else return false;
  }
  unignoreFile({ name }) {
   const existingFile = this.files.get(name);
   if (existingFile) {
    existingFile.ignore = false;
    existingFile.ignoreOnce = Boolean(existingFile.pending);
    return true;
   }
   else return false;
  }

  addCallback({ callback, associatedWith }) {
   if (!callback) throw new Error(`Callback is missing.`);
   this.callbacks.set(callback, associatedWith);
  }
  removeCallback({ callback }) {
   this.callbacks.delete(callback);
  }
  removeCallbacks({ associatedWith } = {}) {
   if (associatedWith) this.callbacks.forEach((a, callback) => a === associatedWith && this.callbacks.delete(callback));
   else this.callbacks.clear();
  }
  pruneCallbacks() {
   this.callbacks.forEach((associatedWith, callback) => {
    if (typeof associatedWith === 'object' && associatedWith.destroyed) this.callbacks.delete(callback);
   });
  }

  invokeCallbacks({ file, eventType, name, fileContent }) {
   (file || this).callbacks.forEach((associatedWith, callback) => callback({ eventType, file, fileName: name, fileContent, associatedWith, callback }));
  }

  onError(error) {
   if (error.code === 'EPERM') this.onChange('delete', '');
   else exports.log(`FS watcher error:`, error);
   this.stop();
  }
  onClose() {
   this.stop();
  }
  onChange(eventType, fileName) {
   // Using path.basename just in case, since I don't trust the watch APIs.
   const name = path.basename(fileName || '');
   const filePath = path.join(this.path, name);
   const file = this.files.get(name);
   const invokeParams = { file, name, eventType };
   if (file && !file.deleted && eventType !== 'delete') {
    this.setFilePending({ file, callback: async () => {
     try {
      const content = await fs.promises.readFile(filePath, { encoding: 'binary' });
      if (file.pending || file.size !== content.length) {
       // Repeat the process if old size and new size don't match.
       // The idea is to allow writing to finish before invoking the callbacks, since the watch API may send change events at the beginning of a chunky write process.
       file.size = content.length;
       if (!file.pending) this.onChange(eventType, fileName);
      }
      else {
       const ignore = file.ignore || file.ignoreOnce;
       if (file.ignoreOnce) file.ignoreOnce = false;
       const hash = crypto.createHash('sha256').update(content).digest();
       if (hash.compare(file.hash) !== 0) {
        file.hash = hash;
        if (!ignore) {
         let fileContent = content.toString();
         // Remove UTF-8 BOM (if any)
         if (fileContent.startsWith(`\xef\xbb\xbf`)) fileContent = fileContent.slice(3);
         this.invokeCallbacks({ ...invokeParams, fileContent });
        }
       }
      }
     }
     catch (error) {
      if (eventType === 'rename') {
       file.deleted = true;
       this.invokeCallbacks({ ...invokeParams, eventType: 'delete' });
       this.invokeCallbacks({ ...invokeParams, file: undefined, eventType: 'delete' });
      }
      else {
       this.invokeCallbacks({ ...invokeParams, eventType: 'error', error });
       this.invokeCallbacks({ ...invokeParams, file: undefined, eventType: 'error', error });
      }
     }
    }});
   }
   else if (eventType !== 'change') {
    if (eventType === 'rename') {
     (async () => {
      try {
       const stats = await fs.promises.stat(filePath);
       if (file) {
        if (file.deleted) file.deleted = false;
        this.invokeCallbacks({ ...invokeParams, file, eventType: (stats.isDirectory() ? 'directory' : 'file') });
       }
       this.invokeCallbacks({ ...invokeParams, file: undefined, eventType: (stats.isDirectory() ? 'directory' : 'file') });
      }
      catch (error) {
       if (file) this.invokeCallbacks({ ...invokeParams, file, eventType: 'delete' });
       this.invokeCallbacks({ ...invokeParams, file: undefined, eventType: 'delete' });
      }
     })();
    }
    else this.invokeCallbacks(invokeParams);
   }
  }

  update() {
   if (exports.utils.DirectoryWatcher.prototype !== Object.getPrototypeOf(this)) Object.setPrototypeOf(this, exports.utils.DirectoryWatcher.prototype);
  }
 }

 return {
  watchDirectory,
  DirectoryWatcher,
 };
};
