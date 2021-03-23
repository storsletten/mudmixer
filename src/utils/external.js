const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

module.exports = main => {
 const exports = main.exports;
 const platform = os.platform();

 const msgBox = (msg, title = exports.title() || 'Message') => {
  if (platform === 'win32') {
   exports.log(`Message box:`, msg);
   childProcess.spawn('cscript.exe', [path.join(__dirname, 'msgBox.vbs'), msg, title], {
    windowsHide: true,
    detached: true,
    stdio: 'ignore',
   }).unref();
  }
  else exports.log(`msgBox() not currently supported on this platform. Message said:`, msg);
 };

 const localEdit = async ({ device, dirName, baseName, content }) => {
  if (!baseName) throw new Error(`Missing baseName`);
  else if (!dirName) throw new Error(`Missing dirName`);
  dirName = path.resolve(dirName);
  const textEditor = (device && device.session && device.session.data.options.textEditor) || exports.config.textEditor || 'notepad';
  const filePath = path.join(dirName, baseName);
  const watcher = exports.directoryWatchers.get(dirName);
  const fileIgnored = watcher && watcher.ignoreFile({ name: baseName });
  try {
   await fs.promises.writeFile(filePath, Array.isArray(content) ? content.join(os.EOL) : (content || ''), {
    encoding: 'binary',
    flag: (content !== undefined ? 'w' : 'wx'),
   }).catch(() => undefined);
   if (!run(textEditor, baseName, { cwd: dirName })) throw new Error(`Failed to launch local edit.`);
  }
  finally {
   if (fileIgnored) watcher.unignoreFile({ name: baseName });
  }
 };

 const run = (app, args = [], options = {}) => {
  if (platform === 'win32') {
   childProcess.spawn('cmd.exe', ['/C', 'start', '""', app, ...(Array.isArray(args) ? args : [args])], {
    ...options,
    windowsHide: true,
    detached: true,
    stdio: 'ignore',
   }).unref();
   return true;
  }
  else exports.log(`run() not currently supported on this platform.`);
 };

 const powershell = (command, options = {}) => {
  if (platform === 'win32') return run('powershell', ['-version', '2.0', '-EncodedCommand', Buffer.from(command, 'utf16le').toString('base64')], options);
  else exports.log(`powershell() not currently supported on this platform.`);
 };

 return {
  msgBox,
  localEdit,
  powershell,
  run,
 };
};
