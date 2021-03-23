module.exports = main => {
 const exports = main.exports;

 class Prompt extends exports.Action {
  constructor(options) {
   super(options);
   const { device, middleware, lines, message, prompt, multiline, abortOnBlank } = options;
   if (this.resolveValueOnly === undefined) this.resolveValueOnly = true;
   this.lines = lines instanceof exports.utils.ChainableArray ? lines : new exports.utils.ChainableArray();
   this.multiline = Boolean(multiline);
   // If abortOnBlank is true, then empty line / lines will be rejected.
   this.abortOnBlank = Boolean(abortOnBlank);
   if (message) {
    if (typeof message === 'string') device.tell(message);
    else device.tell(...message);
   }
   if (prompt !== false) device.tell(middleware.messages[this.multiline ? 'multilinePrompt' : 'prompt']);
  }

  execute(args) {
   const { device, middleware, line, options } = args;
   if (line.toLowerCase() === '@abort') {
    device.tell(middleware.messages.commandAborted);
    this.reject({ ...args, lines: this.lines, reason: 'userAborted' });
   }
   else if (this.multiline) {
    if (line === '.') {
     if (this.lines.length > 0 || !this.abortOnBlank) this.resolve({ ...args, lines: this.lines, value: this.lines });
     else {
      device.tell(middleware.messages.commandAborted);
      this.reject({ ...args, lines: this.lines, reason: 'blank' });
     }
    }
    else this.lines.push(line);
   }
   else if (line.trim() || !this.abortOnBlank) this.resolve({ ...args, lines: (line ? this.lines.push(line) : this.lines), value: line.trim() });
   else {
    device.tell(middleware.messages.commandAborted);
    this.reject({ ...args, lines: this.lines, reason: 'blank' });
   }
  }
 }

 exports.Prompt = Prompt;
};
