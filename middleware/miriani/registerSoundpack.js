module.exports = (main, middleware) => {
 const exports = main.exports;
 const device = middleware.device;

 device.events.on('ready', () => {
  // Since Miriani's login prompt doesn't care about OOB messages, we'll need to register the soundpack this way instead.
  if (device.soundpack) device.tellServer(`register_soundpack ${device.soundpack.name} | ${device.soundpack.version}`);
 });
};
