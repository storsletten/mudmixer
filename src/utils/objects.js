module.exports = main => {
 const exports = main.exports;

 const isRegularObject = (...objects) => {
  for (let i=0; i<objects.length; i++) {
   if (!objects[i] || typeof objects[i] !== 'object' || objects[i][Symbol.iterator]) return false;
  }
  return true;
 };

 const mergeRegularObject = (target, source, options = {}) => {
  // This function deep merges regular (non-iterable) objects and returns an array of strings pointing to values that were changed.
  // All objects copied to target will be cloned, i.e. changing the target later will not affect the source.
  // You can set options.overwrite to true if you want values in target to be overwritten by values from source.
  const updates = [];
  if (isRegularObject(target, source)) {
   // Don't deep merge arrays or other iterable objects.
   for (let key in source) {
    if (!(key in target)) {
     target[key] = (typeof source[key] === 'object' ? JSON.parse(JSON.stringify(source[key])) : source[key]);
     updates.push(key);
    }
    else if (isRegularObject(source[key]) && isRegularObject(target[key])) {
     mergeRegularObject(target[key], source[key], options).forEach(update => updates.push(`${key}.${update}`));
    }
    else if (options.overwrite && target[key] !== source[key]) {
     if (Array.isArray(source[key])) {
      const serializedSource = JSON.stringify(source[key]);
      if (!Array.isArray(target[key]) || serializedSource !== JSON.stringify(target[key])) {
       target[key] = JSON.parse(serializedSource);
       updates.push(key);
      }
     }
     else if (isRegularObject(source[key])) {
      target[key] = JSON.parse(JSON.stringify(source[key]));
      updates.push(key);
     }
     else {
      target[key] = source[key];
      updates.push(key);
     }
    }
   }
  }
  return updates;
 };

 const pruneRegularObject = (target, template, options = {}) => {
  // This function performs a deep pruning of regular (non-iterable) objects.
  // I.e. keys that don't exist in template will be removed from target.
  // If options.fix is true, then this function will also prune keys that refer to regular objects in template but non-regular objects in target.
  // The function returns an array of strings that describe which properties were removed.
  const updates = [];
  if (isRegularObject(target, template)) {
   // Don't deep prune arrays or other iterable objects.
   for (let key in target) {
    if (!(key in template)) {
     delete target[key];
     updates.push(key);
    }
    else if (isRegularObject(template[key])) {
     if (isRegularObject(target[key])) pruneRegularObject(target[key], template[key], options).forEach(update => updates.push(`${key}.${update}`));
     else if (options.fix) {
      delete target[key];
      updates.push(key);
     }
    }
   }
  }
  return updates;
 };

 const changePrototypeOf = (classInstance, newProto) => {
  // This function should only be used on class instances, as it depends on Function.prototype.toString.
  // It returns true if the prototype is changed, false otherwise.
  const oldProto = Object.getPrototypeOf(classInstance);
  if (oldProto !== newProto && oldProto.constructor.toString() !== newProto.constructor.toString()) {
   Object.setPrototypeOf(classInstance, newProto);
   return true;
  }
  else return false;
 };

 return {
  isRegularObject,
  mergeRegularObject,
  pruneRegularObject,
  changePrototypeOf,
 };
};
