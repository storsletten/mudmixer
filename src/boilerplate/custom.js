module.exports = async (main) => {
 const exports = main.exports;

 exports.events.when('ready', () => {
  // Here you can put custom code that will run after every time MUDMixer starts / restarts.
 });
};
