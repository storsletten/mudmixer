const fs = require('fs');
const path = require('path');

module.exports = main => {
 const exports = main.exports;

 exports.getLogger = (name) => {
  const lcName = name.toLowerCase();
  const existingLogger = exports.loggers.get(lcName);
  if (existingLogger) return existingLogger;
  else return new exports.Logger({ name });
 };

 exports.searchLogDirectory = ({ device, middleware, loggerName, regexpSearch, searchType }) => {
  // It would have been amazing if promises could be rejected.
  const promise = device.currentLogSearchPromise = (async () => {
   if (!loggerName) loggerName = 'default';
   const logsDir = exports.dataPath('logs');
   const logDir = path.join(logsDir, loggerName);
   const yearEnts = await fs.promises.readdir(logDir, { withFileTypes: true }).catch(() => undefined);
   if (device.destroyed || device.currentLogSearchPromise !== promise) return;
   if (!yearEnts) return device.tell(`There is no ${loggerName} log directory.`);
   if (yearEnts.length === 0) return device.tell(`The ${loggerName} log directory is empty.`);
   const years = (yearEnts
    .filter(ent => ent.name.match(/^\d{4}$/) && ent.isDirectory())
    .map(ent => Number(ent.name))
    .sort()
    .reverse()
    .map(year => String(year))
   );
   if (years.length === 0) return device.tell(`The ${loggerName} log directory has no year directories.`);
   const today = new Date();
   today.setHours(0);
   today.setMinutes(0);
   today.setSeconds(0);
   today.setMilliseconds(0);
   let count = 0;
   const maxResultsPerPage = 10;
   // Search can commence
   for (let year of years) {
    const yearDir = path.join(logDir, year);
    const monthEnts = await fs.promises.readdir(yearDir, { withFileTypes: true }).catch(() => undefined);
    if (device.destroyed || device.currentLogSearchPromise !== promise) return;
    if (!monthEnts) continue;
    if (monthEnts.length === 0) continue;
    const months = (monthEnts
     .filter(ent => ent.name.match(/^\d{1,2}$/) && ent.isDirectory())
     .map(ent => Number(ent.name))
     .filter(month => month > 0 && month <= 12)
     .sort()
     .reverse()
     .map(month => String(month))
    );
    if (months.length === 0) continue;
    for (let month of months) {
     const monthDir = path.join(yearDir, month);
     const fileEnts = await fs.promises.readdir(monthDir, { withFileTypes: true }).catch(() => undefined);
     if (device.destroyed || device.currentLogSearchPromise !== promise) return;
     if (!fileEnts) continue;
     if (fileEnts.length === 0) continue;
     const files = (fileEnts
      .filter(ent => ent.name.toLowerCase().endsWith('.txt') && ent.name.match(/^\d{1,2}\D{2}/) && ent.isFile())
      .map(ent => ({
       name: ent.name,
       path: path.join(monthDir, ent.name),
       date: parseInt(ent.name),
       promiseContent: undefined,
      }))
      .filter(file => file.date > 0 && file.date <= 31)
      .sort((a, b) => (b.date - a.date) || b.name.localeCompare(a.name))
     );
     if (files.length === 0) continue;
     // Starting to read all the files before we wait for each file in the right order.
     files.forEach(file => {
      file.promiseContent = fs.promises.readFile(file.path, { encoding: 'binary' }).catch(() => undefined);
     });
     for (let file of files) {
      const content = await file.promiseContent.catch(() => undefined);
      if (!content) continue;
      const match = content.match(regexpSearch);
      if (match) {
       // Found a match!
       if (device.destroyed || device.currentLogSearchPromise !== promise) return;
       if (middleware && count && maxResultsPerPage && (count % maxResultsPerPage) === 0) {
        await middleware.confirm({
         message: `View more results?`,
         noMessage: `Search canceled.`,
         resolveOnBlank: true,
        });
       }
       count++;
       const date = new Date(Number(year), Number(month) - 1, file.date);
       const daysAgo = Math.round((today - date) / (1000 * 3600 * 24));
       const daysAgoStr = (daysAgo === 0 ? 'Today' : `${Math.abs(daysAgo)} ${Math.abs(daysAgo) === 1 ? 'day' : 'days'} ${daysAgo > 0 ? 'ago' : 'into the future'}`);
       const maxChunkLength = 150;
       let backtrackLength = Math.min(match.index, Math.floor(maxChunkLength / 2));
       let chunk = content.slice(match.index - backtrackLength, Math.min(match.index + maxChunkLength - backtrackLength, content.length - 1));
       let i;
       if (backtrackLength > 0) {
        i = chunk.lastIndexOf("\n", backtrackLength - 1);
        if (i === -1) i = chunk.lastIndexOf("\r", backtrackLength - 1);
        if (i !== -1) {
         chunk = chunk.slice(++i);
         backtrackLength -= i;
        }
        else if (match.index > backtrackLength) chunk = `... ${chunk.slice(4)}`;
       }
       i = chunk.indexOf("\r", backtrackLength);
       if (i === -1) i = chunk.indexOf("\n", backtrackLength);
       if (i !== -1) chunk = chunk.slice(0, i);
       else chunk = `${chunk.slice(0, -4)} ...`;
       device.tell(`${daysAgoStr}: ${chunk}`);
      }
     }
    }
   }
   if (device.destroyed || device.currentLogSearchPromise !== promise) return;
   device.tell(`${searchType ? `${searchType} search` : 'Search'} complete. ${count} ${count === 1 ? 'result' : 'results'} found in the ${loggerName} log directory.`);
  })().finally(() => {
   if (device.currentLogSearchPromise === promise) device.currentLogSearchPromise = undefined;
  });
  return promise;
 };
};
