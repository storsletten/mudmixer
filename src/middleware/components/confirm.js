module.exports = main => {
 const exports = main.exports;

 class Confirm extends exports.Action {
  constructor(options) {
   super(options);
   const { device, middleware, message, noMessage, yesMessage, resolveOnBlank, rejectOnBlank, prompt } = options;
   this.message = message;
   this.noMessage = noMessage;
   this.yesMessage = yesMessage;
   this.resolveOnBlank = resolveOnBlank;
   this.rejectOnBlank = rejectOnBlank;
   this.prompt = prompt;
   if (message) {
    if (typeof message === 'string') device.tell(message);
    else device.tell(...message);
   }
   if (prompt !== false) device.tell(middleware.messages.confirm);
  }

  execute(args) {
   const { device, middleware, line, options } = args;
   const lcLine = line.trim().toLowerCase();
   if (lcLine === '@abort') {
    device.tell(middleware.messages.commandAborted);
    this.reject({ ...args, reason: 'userAborted' });
   }
   else if (lcLine ? 'yes'.startsWith(lcLine) : this.resolveOnBlank) {
    if (this.yesMessage) device.tell(this.yesMessage);
    this.resolve(true);
   }
   else if (lcLine ? 'no'.startsWith(lcLine) : this.rejectOnBlank) {
    if (this.noMessage) device.tell(this.noMessage);
    this.reject({ ...args, reason: 'userAnsweredNo' });
   }
   else {
    if (this.message) {
     if (typeof this.message === 'string') device.tell(this.message);
     else device.tell(...this.message);
    }
    if (this.prompt !== false) device.tell(middleware.messages.confirm);
   }
  }
 }

 exports.Confirm = Confirm;
};
