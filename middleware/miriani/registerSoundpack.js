module.exports = (main, middleware) => {
 const exports = main.exports;
 const device = middleware.device;

 device.events.on('registerSoundpack', soundpack => {
  if (device.events.is('ready')) device.tellServer(`#$#register_soundpack ${soundpack.name} | ${soundpack.version}`);
 });
 device.events.on('ready', () => {
  if (device.soundpack) device.tellServer(`register_soundpack ${device.soundpack.name} | ${device.soundpack.version}`);
 });
};
