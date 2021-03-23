module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `name`,
  aliases: ['sa', 'add-session'],
  help: [
   `This command creates a new session.`,
   `The name is the line of text that you would want to use with the CONNECT command when connecting to the session.`,
  ],
  action: async function({ device, argstr }) {
   const sessionName = argstr.trim();
   if (!sessionName) return device.tell(`Add a new session with what name?`);
   const invalidCharacters = exports.utils.invalidFileName(sessionName);
   if (invalidCharacters) return device.tell(`The session name can't contain ${exports.utils.englishList(invalidCharacters, { and: 'or' })}.`);
   const existingSession = exports.getSession(sessionName, false);
   if (existingSession) return device.tell(`A session with that name already exists.`);
   const session = new exports.Session({ data: {}, name: sessionName, filePath: exports.dataPath('sessions', `${sessionName}.json`) });
   device.tell(`Session added. You can switch to it using MX SESSION-SWITCH.`);
  },
 };
};
