module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `name`,
  aliases: ['sr', 'remove-session'],
  help: [
   `This command removes a session.`,
  ],
  action: async function({ device, middleware, argstr }) {
   const sessionName = argstr.trim();
   let session;
   if (!sessionName) {
    const choices = [...exports.sessions.values()].sort((a, b) => a.name > b.name);
    if (choices.length === 0) return device.tell(`There are no sessions to remove.`);
    const { choiceIndex } = await middleware.menu({
     choices: choices.map(session => session.name),
     message: `Choose a session to remove:`,
    });
    session = choices[choiceIndex];
   }
   else {
    session = exports.getSession(sessionName);
    if (!session) return device.tell(`Found no session by that name.`);
   }
   await middleware.confirm({
    message: `Are you sure you want to remove ${session.title()}?`,
    noMessage: `Not removing it.`,
   });
   if (session === device.session) device.unsetSession();
   session.close();
   await exports.removeSessionFile(session.name);
   device.tell(`Removed.`);
  },
 };
};
