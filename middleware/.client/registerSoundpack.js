module.exports = (main, middleware) => {
 const exports = main.exports;

 middleware.setCommand('#$#register_soundpack', ({ device, argstr }) => {
  const args = argstr.split(' | ');
  const name = args[0].trim();
  if (name) {
   const oldSoundpack = device.soundpack;
   const newSoundpack = {
    name,
    version: (args.length > 0 ? args[1] : undefined),
   };
   device.soundpack = newSoundpack;
   device.tell(`#$#mx version ${exports.package.version || 'unknown'}`);
   device.events.emit('registerSoundpack', newSoundpack, oldSoundpack);
  }
 });
};
