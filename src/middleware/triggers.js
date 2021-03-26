module.exports = main => {
 const exports = main.exports;

 class Triggers {
  constructor() {
   this._structures = new Map();
   this.setType('interceptor', null); // When active, this can be one single Action or callback.
   this.setType('cmd', new Map()); // Case-insensitive commands (verbs). Each key must be a single lowercase word.
   this.setType('ci', new Map()); // Case-insensitive triggers (keys must be lowercase).
   this.setType('cs', new Map()); // Case-sensitive triggers.
   this.setType('fn', new Map()); // Functions. Keys are merely identifiers.
   this.setType('re', new Map()); // Regexp triggers.
  }

  close() {
   if (this.destroyed) return;
   this.destroyed = true;
   this.clearAll();
   this._structures.clear();
  }

  clearAll() {
   for (let [type, structure] of this._structures) {
    if (!structure) continue;
    else if (structure instanceof Map) {
     for (let [trigger, data] of structure) {
      const { action } = data;
      // If the trigger is an Action, then we need to unset it properly to reject its promise.
      if (action instanceof exports.Action) this.unsetTrigger({ type, trigger });
     }
     structure.clear();
    }
    else this.unsetTrigger({ type });
   }
  }

  clearPackage(name) {
   for (let [type, structure] of this._structures) {
    if (!structure) continue;
    else if (structure instanceof Map) {
     for (let [trigger, data] of structure) {
      if (data.package === name) this.unsetTrigger({ type, trigger });
     }
    }
    else if (structure.package === name) this.unsetTrigger({ type });
   }
  }

  getType(name) {
   return this._structures.get(name);
  }

  setType(name, structure) {
   if (this._structures.has(name)) throw new Error(`Trigger type ${name} already exists.`);
   this._structures.set(name, structure);
  }

  setTrigger({ packageName, type, trigger, action }) {
   const isAction = (action instanceof exports.Action);
   // First unsetting the trigger in case it exists already.
   this.unsetTrigger({ type, trigger });
   // Yeah, unsetting the existing trigger even if it turns out we won't set the new one after all. I can't explain why, but I trust my intuition.
   // Not setting an Action that has already been resolved or rejected.
   if (!isAction || action.status === 'pending') {
    // Then we will set the new trigger.
    // First let's see what kind of structure we're left with after unsetting.
    const structure = this._structures.get(type);
    // Applying corrections if necessary.
    // If you change these, then also change in unsetTrigger() accordingly!
    if (type === 'ci' || type === 'cmd') trigger = trigger.toLowerCase();
    else if (type === 're') {
     if (!(trigger instanceof RegExp)) trigger = new RegExp(trigger);
    }
    // Construct the data object.
    const data = { action, packageName };
    // Finally setting the trigger.
    if (structure) structure.set(trigger, data);
    else this._structures.set(type, data);
    if (isAction) action.setTriggerReference({ triggers: this, type, trigger, packageName });
   }
   return { triggers: this, type, trigger, action, packageName };
  }

  unsetTrigger({ type, trigger }) {
   // This method returns { triggers, trigger, type, action, packageName } of the trigger being unset.
   // If the trigger does not exist, then it returns { triggers, trigger, type }.
   const structure = this._structures.get(type);
   // If type doesn't exist, then we must throw (so that setTrigger() won't happily continue).
   if (structure === undefined) throw new Error(`Trigger type ${type} does not exist.`);
   let data;
   if (structure instanceof Map) {
    // Applying corrections if necessary.
    // If you change these, then also change in setTrigger() accordingly!
    if (type === 'ci' || type === 'cmd') trigger = trigger.toLowerCase();
    else if (type === 're') {
     if (typeof trigger === 'string' || !structure.has(trigger)) {
      const triggerString = trigger.toString();
      for (let [key, val] of structure) {
       if (triggerString === key.toString()) {
        trigger = key;
        data = val;
        break;
       }
      }
     }
    }
    if (!data) data = structure.get(trigger);
   }
   else data = structure;
   // If we have no data by this point, then the trigger does not exist.
   if (!data) return { triggers: this, trigger, type };
   if (structure instanceof Map) structure.delete(trigger);
   else this._structures.set(type, null);
   const { action, packageName } = data;
   // If it's an Action, then we'll need to reject it.
   if (action instanceof exports.Action) action.reject({ triggers: this, type, trigger, action, packageName, reason: 'triggerUnset' });
   return { triggers: this, trigger, type, action, packageName };
  }
 }

 class ClientTriggers extends Triggers {
  update() {
   exports.utils.changePrototypeOf(this, exports.ClientTriggers.prototype, { depth: 2 });
  }
 }

 class ServerTriggers extends Triggers {
  update() {
   exports.utils.changePrototypeOf(this, exports.ServerTriggers.prototype, { depth: 2 });
  }
 }

 exports.Triggers = Triggers;
 exports.ClientTriggers = ClientTriggers;
 exports.ServerTriggers = ServerTriggers;
};
