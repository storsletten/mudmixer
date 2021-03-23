module.exports = (main, middleware) => {
 const exports = main.exports;
 const device = middleware.device;

 device.events.on('unregisterSoundpack', () => {
  device.tellServer(`#$#unregister_soundpack`);
 });
};
