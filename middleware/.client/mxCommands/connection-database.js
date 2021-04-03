const fs = require('fs');

module.exports = (main, middleware) => {
 const exports = main.exports;

 return {
  syntax: `name`,
  commands: [`${exports.config.mxCommand || ''}cd`],
  aliases: ['cd', 'cdatabase', 'database-connection'],
  help: [
   `This command sets which database that the specified connection should use.`,
   `These databases are stored in the databases directory of your MUDMixer data folder.`,
  ],
  action: async function({ device, middleware, argstr }) {
   const server = await middleware.selectServer({ argstr });
   if (server.db) device.tell(`${server.name} uses the ${server.db.name} database.`);
   else device.tell(`No database is set for ${server.name}.`);
   const lcDatabaseName = (server.db && server.db.name && server.db.name.toLowerCase());
   const choices = [
    [`Create new database`],
    ...[...(await exports.getDatabaseFileNames())].map(ent => {
     const lcName = ent[0].toLowerCase();
     const stopUsing = Boolean(lcDatabaseName && lcDatabaseName === lcName);
     return [
      `${stopUsing ? 'Stop using' : 'Use'} ${exports.utils.titlify(ent[0])}`,
      stopUsing,
      lcName,
      ...ent,
     ];
    }).sort((a, b) => a[2].localeCompare(b[2])),
   ];
   const { choiceIndex } = await middleware.menu(choices.map(choice => choice[0]));
   if (choiceIndex === 0) {
    const newName = exports.utils.sanitizeFileName(await middleware.prompt({
     abortOnBlank: true,
     message: `What would you like to call the new database?`,
    })).trim();
    const lcNewName = newName.toLowerCase();
    // Using lowercase filename to try to avoid duplicates because of case sensitivity on certain platforms.
    const baseName = `${lcNewName}.json`;
    const dbPath = exports.dataPath('databases', baseName);
    try {
     await fs.promises.writeFile(dbPath, `{}`, { encoding: 'binary', flag: 'wx' });
     await server.setDatabase(exports.getDatabase(lcNewName));
     if (server.config.db !== lcNewName) {
      server.config.db = lcNewName;
      await device.session.save();
     }
     exports.log(`Created database: ${lcNewName}`);
     device.tell(`Database created and set for ${server.name}.`);
    }
    catch (error) {
     exports.log(`Failed to create new database:`, error);
     device.tell(`Failed to create database.`);
    }
   }
   else {
    const [ menuLabel, stopUsing, lcName, name, dbPath ] = choices[choiceIndex];
    if (stopUsing) {
     server.unsetDatabase();
     if (server.config.db) {
      server.config.db = '';
      await device.session.save();
     }
     device.tell(`Database unset.`);
    }
    else {
     await server.setDatabase(exports.getDatabase(name));
     if (server.config.db !== name) {
      server.config.db = name;
      await device.session.save();
     }
     device.tell(`Database set.`);
    }
   }
  },
 };
};
