const crypto = require('crypto');

module.exports = main => {
 const exports = main.exports;

 const random = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
 const randomHex = (bytes = 4) => crypto.randomBytes(bytes).toString('hex');

 // These hash functions are SHA-512 with a salty twist.
 const hash = str => {
  const salt = randomHex(2);
  return crypto.createHash('sha512').update(`${salt.slice(0, 1)}${str}${salt.slice(2)}`).digest('hex');
 };
 const hashCheck = (str, hash) => {
  let match = false;
  for (let i=0; i<4096; i++) {
   const salt = i.toString(16).padStart(3, '0');
   // If we find a match, we still finish the full cycle to keep the sense of time consistent.
   if (hash === crypto.createHash('sha512').update(`${salt.slice(0, 1)}${str}${salt.slice(1)}`).digest('hex')) match = true;
  }
  return match;
 };
 const isHash = str => Boolean(str.match(/^[a-z0-9]{128}$/));
 const ensureHash = str => isHash(str) ? str : hash(str);

 return {
  hash,
  hashCheck,
  isHash,
  ensureHash,
  random,
  randomHex,
 };
};
