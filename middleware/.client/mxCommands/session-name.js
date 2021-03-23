module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `[name]`,
  aliases: ['sn', 'name-session'],
  help: [
   `This command sets a new name for the current session.`,
   `If no name is provided, then the current name is shown.`,
  ],
  action: async function({ device, argstr }) {
   const sessionName = argstr.trim();
   if (!sessionName || device.session.name.toLowerCase() === sessionName.toLowerCase()) {
    device.tell(`Session name: ${device.session.name}`);
   }
   else {
    const invalidCharacters = exports.utils.invalidFileName(sessionName);
    if (invalidCharacters) device.tell(`The session name can't contain ${invalidCharacters.join(', ')}`);
    else {
     try {
      await device.session.setName(sessionName);
      device.tell(`New session name is: ${sessionName}`);
     }
     catch (error) {
      exports.log(`mx session-name error:`, error);
      device.tell(error.message || `Failed to rename the session.`);
     }
    }
   }
  },
 };
};
