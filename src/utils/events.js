const EventEmitter = require('events');

module.exports = main => {
 const exports = main.exports;

 class Events {
  constructor(object) {
   this._listeners = new Map();
   this._onceListeners = new Map();
   this._binaryStates = new Set();
   if (object) this._assignedObject = object;
   else {
    this._assignedObject = new EventEmitter();
    this._madeNewObject = true;
   }
  }

  close() {
   this.removeAllListeners();
   this._binaryStates.clear();
   this._assignedObject = null;
   this.destroyed = true;
  }

  _setListener({ event, listener, once, prepend }) {
   if (!listener) throw new Error(`Listener is required.`);
   this.removeListener(event, listener);
   if (once) {
    const listeners = this._onceListeners.get(event);
    const wrapper = (...args) => {
     this.delete(event, listener);
     return listener(...args);
    };
    this._assignedObject[prepend ? 'prependOnceListener' : 'once'](event, wrapper);
    if (!listeners) this._onceListeners.set(event, new Map([[listener, wrapper]]));
    else listeners.set(listener, wrapper);
   }
   else {
    const listeners = this._listeners.get(event);
    this._assignedObject[prepend ? 'prependListener' : 'on'](event, listener);
    if (!listeners) this._listeners.set(event, new Set([listener]));
    else listeners.add(listener);
   }
   return this;
  }

  removeListener(event, listener) {
   const listeners = this._listeners.get(event);
   const onceListeners = this._onceListeners.get(event);
   if (listener) {
    if (listeners && listeners.delete(listener)) {
     if (listeners.size === 0) this._listeners.delete(event);
     this._assignedObject.removeListener(event, listener);
    }
    else if (onceListeners) {
     const wrapper = onceListeners.get(listener);
     if (wrapper) {
      if (onceListeners.size === 1) this._onceListeners.delete(event);
      else onceListeners.delete(listener);
      this._assignedObject.removeListener(event, wrapper);
     }
    }
   }
   else {
    if (listeners) {
     for (let listener of listeners) this._assignedObject.removeListener(event, listener);
     this._listeners.delete(event);
    }
    if (onceListeners) {
     for (let wrapper of onceListeners.values()) this._assignedObject.removeListener(event, wrapper);
     this._onceListeners.delete(event);
    }
   }
   return this;
  }

  removeAllListeners() {
   if (this._madeNewObject) this._assignedObject.removeAllListeners();
   else {
    this._listeners.forEach((listeners, event) => {
     for (let listener of listeners) this._assignedObject.removeListener(event, listener);
    });
    this._onceListeners.forEach((onceListeners, event) => {
     for (let wrapper of onceListeners.values()) this._assignedObject.removeListener(event, wrapper);
    });
   }
   this._listeners.clear();
   this._onceListeners.clear();
   return this;
  }

  addListener(event, listener) { return this._setListener({ event, listener }); }
  off(event, listener) { return this.removeListener(event, listener); }
  on(event, listener) { return this._setListener({ event, listener }); }
  once(event, listener) { return this._setListener({ event, listener, once: true }); }
  prependListener(event, listener) { return this._setListener({ event, listener, prepend: true }); }
  prependOnceListener(event, listener) { return this._setListener({ event, listener, prepend: true, once: true }); }

  is(event) { return this._binaryStates.has(event); }
  when(event, listener) {
   this.on(event, listener);
   if (this.is(event)) listener();
   return this;
  }
  onceWhen(event, listener) {
   if (this.is(event)) listener();
   else this.once(event, listener);
   return this;
  }
  prependWhen(event, listener) {
   this.prependListener(event, listener);
   if (this.is(event)) listener();
   return this;
  }
  prependOnceWhen(event, listener) {
   if (this.is(event)) listener();
   else this.prependOnce(event, listener);
   return this;
  }

  emit(event, ...args) { return this._assignedObject.emit(event, ...args); }
  emitBinaryState(event, deactivationEvent) {
   // Syntax: .emitBinaryState(STRING event [, STRING deactivationEvent ])
   // If deactivationEvent is not set, then this activates the binary state and emits the event (if not already active).
   // Otherwise it deactivates the binary state and emits the deactivation event (if already active).
   const binaryState = !deactivationEvent;
   if (binaryState !== this.is(event)) {
    if (binaryState) {
     this._binaryStates.add(event);
     return this._assignedObject.emit(event);
    }
    else {
     this._binaryStates.delete(event);
     return this._assignedObject.emit(deactivationEvent);
    }
   }
  }
 }

 return Events;
};
