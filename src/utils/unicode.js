module.exports = main => {
 const exports = main.exports;

 const unidecode = str => str.replace(unidecodeRegexp, sequence => (unidecodeTable[sequence] || sequence));

 const unidecodeTable = {
  '\xc2\xa1': '!',
  '\xc2\xab': '"',
  '\xc2\xb7': '.',
  '\xc2\xbb': '"',
  '\xc2\xbf': '?',
  '\xe2\x80\x93': '-',
  '\xe2\x80\x94': '-',
  '\xe2\x80\x98': "'",
  '\xe2\x80\x99': "'",
  '\xe2\x80\x9a': '"',
  '\xe2\x80\x9b': '"',
  '\xe2\x80\x9c': '"',
  '\xe2\x80\x9d': '"',
  '\xe2\x80\x9e': '"',
  '\xe2\x80\x9f': '"',
  '\xe2\x80\xa4': '.',
  '\xe2\x80\xa6': '...',
  '\xe2\x80\xb9': '"',
  '\xe2\x80\xba': '"',
  '\xe2\x81\x83': '-',
  '\xe2\x9d\x9b': '"',
  '\xe2\x9d\x9c': '"',
  '\xe2\x9d\x9d': '"',
  '\xe2\x9d\x9e': '"',
  '\xe2\x9d\x9f': '"',
  '\xe2\x9d\xae': '"',
  '\xe2\x9d\xaf': '"',
  '\xe2\xb9\x82': '"',
  '\xe3\x80\x9d': '"',
  '\xe3\x80\x9e': '"',
  '\xe3\x80\x9f': '"',
  '\xef\xbc\x82': '"',
 };

 const unidecodeRegexp = new RegExp(`(${
  Object.keys(unidecodeTable)
  .map(sequence => (
   Buffer.from(sequence, 'binary')
   .toString('hex')
   .replace(/../g, '\\x$&')
  ))
  .join('|')
 })`, 'g');

 return {
  unidecode,
 };
};
