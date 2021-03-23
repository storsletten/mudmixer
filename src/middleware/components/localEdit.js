const path = require('path');

module.exports = main => {
 const exports = main.exports;

 class LocalEdit extends exports.Action {
  constructor(options) {
   // If you set options.callback, then this Action will never resolve.
   // Instead, it will invoke the callback every time a new change is detected until the Action is rejected (for example when the middleware closes).
   if (!options.filePath) throw new Error(`Missing filePath`);
   super(options);
   const { device, middleware } = options;
   const filePath = path.resolve(options.filePath);
   (async () => {
    if (this.status !== 'pending') return;
    const baseName = path.basename(filePath);
    const dirName = path.dirname(filePath);
    try {
     await exports.utils.localEdit({ device, dirName, baseName, content: options.content });
     // device.tell(`Opening local edit...`);
     const watcher = await exports.utils.watchDirectory(dirName);
     if (this.status !== 'pending') return;
     const callback = ({ eventType, fileContent }) => {
      if (eventType === 'change') {
       if (options.callback) options.callback({ ...options, action: this, fileContent });
       else this.resolve(fileContent);
      }
      else this.reject();
     };
     await watcher.watchFile({ name: baseName, associatedWith: middleware, callback });
     this.baseName = baseName;
     this.dirName = dirName;
     this.filePath = filePath;
     this.watcher = watcher;
     this.watcherCallback = callback;
     if (this.status !== 'pending') this.cleanup();
    }
    catch (error) {
     exports.log(`LocalEdit error:`, error);
     if (this.status === 'pending') {
      device.tell(`Failed to open local edit.`);
      this.reject();
     }
    }
   })();
  }

  cleanup() {
   if (this.watcher && this.watcherCallback) {
    this.watcher.removeFileCallback({ name: this.baseName, callback: this.callback });
    this.watcher = undefined;
    this.watcherCallback = undefined;
   }
  }
 }

 exports.LocalEdit = LocalEdit;
};
