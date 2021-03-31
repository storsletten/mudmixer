module.exports = main => {
 const exports = main.exports;

 const unidecode = str => {
  const chunks = [];
  let extracted = 0;
  for (let i=0; i<str.length; i++) {
   const root = unidecodeData[str[i]];
   if (root) {
    let j = i;
    let node = root;
    while ((++j) < str.length) {
     node = node[str[j]];
     if (typeof node === 'object') continue;
     else break;
    }
    if (typeof node === 'string') {
     chunks.push(str.slice(extracted, i), node);
     i = j;
     extracted = i + 1;
    }
   }
  }
  return (extracted > 0 ? `${chunks.join('')}${str.slice(extracted)}` : str);
 };

 const unidecodeData = {
  '\xc2': {
   '\xab': '"',
   '\xbb': '"',
   '\xb7': '.',
   '\xbf': '?',
   '\xa1': '!',
  },
  '\xe2': {
   '\x80': {
    '\x98': "'",
    '\x99': "'",
    '\xb9': '"',
    '\xba': '"',
    '\x9e': '"',
    '\x9c': '"',
    '\x9f': '"',
    '\x9d': '"',
    '\x9a': '"',
    '\x9b': '"',
    '\xa4': '.',
    '\x94': '-',
    '\x93': '-',
    '\xa6': '...',
   },
   '\x9d': {
    '\x9d': '"',
    '\x9e': '"',
    '\xae': '"',
    '\xaf': '"',
    '\x9b': '"',
    '\x9c': '"',
    '\x9f': '"',
   },
   '\xb9': {
    '\x82': '"',
   },
   '\x81': {
    '\x83': '-',
   },
  },
  '\xe3': {
   '\x80': {
    '\x9d': '"',
    '\x9e': '"',
    '\x9f': '"',
   },
  },
  '\xef': {
   '\xbc': {
    '\x82': '"',
   },
  },
 };

 return {
  unidecode,
 };
};
