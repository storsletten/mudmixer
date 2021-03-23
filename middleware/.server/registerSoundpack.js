module.exports = (main, middleware) => {
 const exports = main.exports;

 middleware.setCommand('#$#register_soundpack', ({ device, argstr, options }) => {
  options.clientsOnly = false;
  const args = argstr.split(' | ');
  const name = args[0].trim();
  if (name) {
   const newSoundpack = {
    name,
    version: (args.length > 0 ? args[1] : undefined),
   };
   const oldSoundpack = device.soundpack;
   device.soundpack = newSoundpack;
   device.events.emit('registerSoundpack', newSoundpack, oldSoundpack);
  }
 });
};
