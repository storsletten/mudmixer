module.exports = (main, middleware) => {
 const exports = main.exports;

 middleware.setCommand('#$#unregister_soundpack', ({ device, options }) => {
  options.clientsOnly = false;
  const soundpack = device.soundpack;
  if (soundpack) {
   device.soundpack = undefined;
   device.events.emit('unregisterSoundpack', soundpack);
  }
 });
};
