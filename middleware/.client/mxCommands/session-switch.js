module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `name`,
  commands: ['mxs'],
  aliases: ['s', 'ss', 'switch-session'],
  help: [
   `This command switches your connection to another session.`,
  ],
  action: async function({ device, middleware, argstr }) {
   const sessionName = argstr.trim();
   let newSession;
   if (!sessionName) {
    const lcExistingSessionName = device.session.name.toLowerCase();
    const choices = [...exports.sessions]
     .filter(ent => ent[0] !== lcExistingSessionName)
     .map(ent => ent[1])
     .sort((a, b) => a.name > b.name);
    if (choices.length === 0) return device.tell(`There are no other sessions to switch to.`);
    const { choiceIndex } = await middleware.menu({
     choices: choices.map(session => session.name),
     message: `Choose a session to switch to:`,
    });
    newSession = choices[choiceIndex];
   }
   else {
    newSession = exports.getSession(sessionName);
    if (!newSession) return device.tell(`Found no session by that name.`);
    if (device.session === newSession) return device.tell(`You are already connected to ${newSession.title()}.`);
   }
   device.unsetSession();
   device.tell(`Switched to session ${JSON.stringify(newSession.name)}.`);
   newSession.addClient(device);
  },
 };
};
