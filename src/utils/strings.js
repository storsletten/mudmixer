const util = require('util');

module.exports = main => {
 const exports = main.exports;

 const capitalize = str => str.replace(/\b\w/, s => s.toUpperCase());
 const capitalizeWords = str => str.replace(/\b\w/g, s => s.toUpperCase());

 const englishList = (strList, options = {}) => {
  if (!Array.isArray(strList)) strList = Array.from(strList);
  switch (strList.length) {
   case 0: return '';
   case 1: return strList[0];
   case 2: return strList.join(` ${options.and || 'and'} `);
   default: return [...strList.slice(0, -1), `${options.and || 'and'} ${strList[strList.length - 1]}`].join(options.comma || ', ');
  }
 };

 const englishOrdinalIndicator = n => {
  const s = String(n);
  const l = s[s.length - 1];
  if ('123'.indexOf(l) !== -1 && (s.length === 1 || s[s.length - 2] !== '1')) {
   const o = { '1': 'st', '2': 'nd', '3': 'rd' };
   return `${s}${o[l]}`;
  }
  else return `${s}th`;
 };

 const englishMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

 const formatDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
 const formatDateWordly = (d = new Date(), includeYear = true) => `${englishMonths[d.getMonth()]} ${englishOrdinalIndicator(d.getDate())}${includeYear ? `, ${d.getFullYear()}` : ''}`;
 const formatTime = (d = new Date()) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
 const formatTimeMS = (d = new Date()) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${d.getMilliseconds()}`;
 const formatDateAndTime = (d = new Date()) => `${formatDate(d)} ${formatTime(d)}`;
 const formatDateAndTimeMS = (d = new Date()) => `${formatDate(d)} ${formatTimeMS(d)}`;

 const week = 604800000;
 const day = 86400000;
 const hour = 3600000;
 const minute = 60000;
 const second = 1000;

 const formatTimeDiff = (d1, d2) => {
  let diff = Math.abs(d1 - d2);
  const weeks = Math.floor(diff / week);
  diff %= week;
  const days = Math.floor(diff / day);
  diff %= day;
  const hours = Math.floor(diff / hour);
  diff %= hour;
  const minutes = Math.floor(diff / minute);
  diff %= minute;
  const seconds = Math.floor(diff / second);
  const result = [];
  if (weeks) result.push(`${weeks} week${weeks !== 1 ? 's' : ''}`);
  if (days) result.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours) result.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes) result.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (seconds) result.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
  if (result.length > 2) return `${result.slice(0, -1).join(', ')}, and ${result[result.length - 1]}`;
  else if (result.length > 0) return result.join(' and ');
  else if (diff > 0) return `${diff} millisecond${diff !== 1 ? 's' : ''}`;
  else return `no time`;
 };

 const formatAmount = (number, word, thousands = true) => `${thousands ? formatThousands(number) : number} ${number == 1 ? word : `${word}s`}`;
 const formatBytes = num => {
  if (num < 100000) return formatAmount(num, 'Byte');
  if (num < 100000000) return `${formatThousands(Math.floor(num / 1024))} kB`;
  if (num < 100000000000) return `${formatThousands(Math.floor(num / 1048576))} mB`;
  return `${formatThousands(Math.floor(num / 1073741824))} gB`;
 };
 const formatThousands = number => String(number).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

 const padTableColumns = (rows, padstr = ' ') => {
  const columnSizes = [];
  rows.forEach(row => row.forEach((col, i) => {
   while (i >= columnSizes.length) columnSizes.push(0);
   if (col.length > columnSizes[i]) columnSizes[i] = col.length;
  }));
  return rows.map(row => {
   const lastIndex = row.length - 1;
   return row.map((col, i) => i < lastIndex ? col.padEnd(columnSizes[i], padstr) : col);
  });
 };

 const formatIPAddress = str => (str.match(/^::ffff:\d+\.\d+\.\d+\.\d+$/) ? str.slice(7) : str);

 const formatPath = (path, options = {}) => {
  // This function just makes the path more human readable.
  if (!path) return path;
  if (options.relativeTo && path.startsWith(options.relativeTo)) {
   const slashes = '/\\';
   if (path === options.relativeTo) path = '.\\';
   else if (slashes.includes(options.relativeTo.slice(-1))) path = path.slice(options.relativeTo.length);
   else if (slashes.includes(path[options.relativeTo.length])) {
    path = path.slice(options.relativeTo.length);
    if (path.length === 1) path = `.${path}`;
    else path = path.slice(1);
   }
  }
  if (options.enclosingQuotes !== false && (options.enclosingQuotes === true || path.includes(' ')) && !path.startsWith('"')) path = `"${path}"`;
  return (options.forwardSlashes === true || !(options.forwardSlashes === false || path.includes('/') || path.startsWith('\\\\'))) ? path.replace(/\\/g, '/') : path;
 };

 const parseArgstr = str => {
  const args = [];
  if (!str) return args;
  let quoted = false;
  let lastChar;
  str.split(/(?<!\\)"/).forEach(arg => {
   if (quoted) {
    if (lastChar && lastChar !== ' ') args[args.length - 1] += `"${arg}"`;
    else args.push(arg);
   }
   else if (arg) {
    lastChar = arg[arg.length - 1];
    arg = arg.trim();
    if (arg) args.push(...arg.split(/\s+/));
   }
   quoted = !quoted;
  });
  return args;
 };

 const titlify = str => {
  str = str.replace(/_/g, ' ').trim();
  // If str has uppercase letters, then we don't capitalize.
  return (str && str.toLowerCase() === str) ? str.replace(/\b[a-z]/g, s => s.toUpperCase()) : str;
 };

 const fileNameRegexp = /[/\\%?*:|"<>]/g;
 const sanitizeFileName = fileName => {
  if (fileName.length > 1 && fileName[0] === '"' && fileName[fileName.length - 1] === '"') fileName = fileName.slice(1, -1);
  return fileName.trim().replace(fileNameRegexp, '_');
 };
 const invalidFileName = fileName => {
  const invalidCharacters = new Set();
  fileName.replace(fileNameRegexp, char => invalidCharacters.add(char));
  return invalidCharacters.size > 0 && Array.from(invalidCharacters);
 };

 const stringify = (val, { depth = 1, indent = 0, details = false } = {}) => {
  if (val === undefined) return 'undefined';
  else if (val === null) return 'null';
  else if (typeof val === 'string') {
   return (details
    ? `"${val.replace(/[\"\\]/g, c => `\\${c}`).replace(/[\x00-\x1f\x80-\xff]/g, c => `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`)}"`
    : val
   );
  }
  else if (typeof val === 'number') return val.toString();
  else if (typeof val === 'boolean') return val.toString();
  else if (typeof val === 'function') {
   const str = val.toString().replace(/ *[[(={].+/s, '');
   if (!str || str === 'function') return 'anonymous function';
   else if (str === 'async' || str === 'async function') return 'anonymous async function';
   else if (str.startsWith('async ') && !str.startsWith('async function ')) return `async function ${str.slice(6)}`;
   else if (!str.startsWith('function ')) return `function ${str}`;
   else return str;
  }
  else if (val instanceof Error) return val.stack || val.toString();
  else if (util.types.isProxy(val)) return Object.prototype.toString.call(val).slice(8, -1);
  const o = { depth: depth - 1, indent: indent + 1, details };
  const indentString = indent > 0 ? ' '.repeat(indent) : '';
  if (Array.isArray(val)) {
   if (details) {
    return `array(${val.length})` + (
     (depth > 0 && val.length > 0)
     ? ` [\n${val.map(item => indentString + stringify(item, o)).join("\n")}\n${indentString.slice(1)}]`
     : ''
    );
   }
   else if (depth > 0 && val.length > 0) return val.map(item => indentString + stringify(item, o)).join("\n");
   else return '';
  }
  if (val instanceof Map) {
   if (details) {
    return `map(${val.size})` + (
     (depth > 0 && val.size > 0)
     ? ` {\n${[...val].map(item => indentString + stringify(item[0], {...o, depth: 0}) + ' => ' + stringify(item[1], o)).join("\n")}\n${indentString.slice(1)}}`
     : ''
    );
   }
   else if (depth > 0 && val.size > 0) return [...val].map(item => indentString + stringify(item[0], {...o, depth: 0}) + ' => ' + stringify(item[1], o)).join("\n");
   else return '';
  }
  if (val instanceof Set) {
   if (details) {
    return `set(${val.size})` + (
     (depth > 0 && val.size > 0)
     ? ` [\n${[...val].map(item => indentString + stringify(item, o)).join("\n")}\n${indentString.slice(1)}]`
     : ''
    );
   }
   else if (depth > 0 && val.size > 0) return [...val].map(item => indentString + stringify(item, o)).join("\n");
   else return '';
  }
  if (val instanceof Date) return formatDateAndTime(val);
  let objectString = Object.prototype.toString.call(val).slice(8, -1).toLowerCase();
  if (val.constructor) {
   const constructorString = val.constructor.toString();
   if (constructorString.startsWith('class ')) objectString = 'instance of ' + constructorString.replace(/ *[[({].+/s, '');
  }
  const objectKeys = Object.keys(val).sort();
  if (details) {
   return `${objectString}(${objectKeys.length})` + (
    (depth > 0 && objectKeys.length > 0)
    ? ` {\n${objectKeys.map(key => indentString + stringify(key, {...o, depth: 0}) + ' => ' + stringify(val[key], o)).join("\n")}\n${indentString.slice(1)}}`
    : ''
   );
  }
  else if (depth > 0 && objectKeys.length > 0) return objectKeys.map(key => indentString + stringify(key, {...o, depth: 0}) + ' => ' + stringify(val[key], o)).join("\n");
  else return '';
 };

 // Function to escape Extended ASCII characters. This assumes the string is binary encoded.
 // It converts characters between 128 and 255 (signed chars) into hex values prefixed with: \x
 const escape = str => str.replace(/[\x80-\xff]/g, char => `\\x${char.charCodeAt(0).toString(16).toUpperCase()}`);

 // This unescape function naively unescapes everything. If it becomes a problem, then I'm happy to make it more restrictive.
 // E.g. if we only want UTF8, then that's between 128 and 239. But unfortunately Extended ASCII goes all the way up to 255, which is also where IAC and other yummy things live.
 const unescape = str => str.replace(/\\+x[0-9A-F]{2}/g, seq => ((seq.length % 2) ? seq : `${seq.slice(0, -4)}${String.fromCharCode(parseInt(seq.slice(-2), 16))}`));

 const formatConsoleLogArgs = (...args) => args.map(arg => stringify(arg)).join(' ');

 return {
  capitalize,
  capitalizeWords,
  englishList,
  englishOrdinalIndicator,
  englishMonths,
  formatAmount,
  formatBytes,
  formatDate,
  formatDateAndTime,
  formatDateAndTimeMS,
  formatDateWordly,
  formatIPAddress,
  formatPath,
  formatThousands,
  padTableColumns,
  formatTime,
  formatTimeMS,
  formatTimeDiff,
  formatConsoleLogArgs,
  titlify,
  parseArgstr,
  sanitizeFileName,
  invalidFileName,
  stringify,
  escape,
  unescape,
 };
};
