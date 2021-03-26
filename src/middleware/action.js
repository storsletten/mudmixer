module.exports = main => {
 const exports = main.exports;

 class Action {
  constructor(options) {
   const { device } = options;
   const middleware = options.middleware || device.middleware;
   this.status = 'pending';
   this.resolveValueOnly = options.resolveValueOnly;
   middleware.actions.add(this);
   this.promise = new Promise((resolve, reject) => {
    this._resolve = resolve;
    this._reject = reject;
   }).finally(() => {
    middleware.actions.delete(this);
    this.cleanup(options);
   }).catch(value => {
    if (device.destroyed || value === null) throw null;
    else if (typeof value === 'object' && value.reason === null) throw null;
    else throw value;
   });
   if (device.destroyed) this.reject('deviceDestroyed');
  }

  setTriggerReference(ref) {
   if (this.status === 'pending') this.triggerReference = ref;
  }
  unsetTriggerReference() {
   if (this.triggerReference) {
    const { triggers, type, trigger } = this.triggerReference;
    this.triggerReference = undefined;
    triggers.unsetTrigger({ type, trigger });
   }
  }

  resolve(args) {
   if (this.status !== 'pending') return;
   this.status = 'fulfilled';
   this.unsetTriggerReference();
   if (typeof args !== 'object') args = { value: args };
   else if (args.reason) throw new Error(`Do not provide a "reason" when resolving an action.`);
   if (this.resolveValueOnly) this._resolve(args.value);
   else {
    if (!args.action) args.action = this;
    this._resolve(args);
   }
  }
  reject(args) {
   if (this.status !== 'pending') return;
   this.status = 'rejected';
   this.unsetTriggerReference();
   if (args === undefined) args = null;
   if (args === null || typeof args !== 'object') args = { reason: args };
   if (!args.action) args.action = this;
   if (!args.reason) args.reason = 'undefined';
   this._reject(args);
  }

  execute(args) {}
  cleanup() {}
 }

 exports.Action = Action;
};
