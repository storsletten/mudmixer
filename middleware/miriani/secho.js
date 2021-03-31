module.exports = (main, middleware) => {
 const exports = main.exports;

 middleware.setCommand('secho', async ({ device, middleware, argstr }) => {
  const text = argstr || (await middleware.prompt({ message: `What would you like to be repeated back to you using soundpack echo?` }));
  device.tell(`#$#soundpack echo | ${text || ''}`);
 });
};
