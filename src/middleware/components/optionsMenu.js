module.exports = main => {
 const exports = main.exports;

 const stringifyOptionValue = val => {
  if (typeof val === 'boolean') return val ? 'On' : 'Off';
  else if (typeof val === 'number') return val.toString();
  else if (typeof val === 'string') {
   if (val.length > 75) return `${val.slice(0, 71)} ...`;
   else return val;
  }
 };

 exports.optionsMenu = async ({ device, middleware, argstr, options, template, saveCallback }) => {
  const templateKeys = Object.keys(template);
  while (!device.destroyed) {
   let templateKey;
   if (argstr) {
    if (argstr.match(/^\d{1,10}$/)) {
     const num = parseInt(argstr);
     if (num < 1 || num > templateKeys.length) {
      device.tell(`Invalid selection.`);
      break;
     }
     else templateKey = templateKeys[num - 1];
    }
    else {
     const searchstr = ` ${argstr.toLowerCase()}`;
     for (let key of templateKeys) {
      if (` ${template[key].name.toLowerCase()}`.includes(searchstr)) {
       templateKey = key;
       break;
      }
     }
    }
    if (!templateKey) {
     device.tell(`Option not found.`);
     break;
    }
   }
   else {
    const { choiceIndex } = await middleware.menu(templateKeys.map(key => {
     const valstr = stringifyOptionValue(options[key]);
     return `${template[key].name}${valstr !== undefined ? `  [${valstr}]` : ''}`;
    }));
    templateKey = templateKeys[choiceIndex];
   }
   if (templateKey) {
    while (!device.destroyed) {
     const { name, type, description, message, abortOnBlank } = template[templateKey];
     let value;
     if (description && !argstr) device.tell(description);
     if (type === 'string') {
      if (options[templateKey]) device.tell(`Current value: ${options[templateKey]}`);
      value = await middleware.prompt({
       message: (message || `Enter a value for the ${name} option:`),
       abortOnBlank,
      });
     }
     else if (type === 'boolean') value = !options[templateKey];
     else if (type === 'number') {
      const { min, max } = template[templateKey];
      if (options[templateKey] !== undefined) device.tell(`Current value: ${options[templateKey]}`);
      const line = await middleware.prompt({
       message: (message || `Enter a number for the ${name} option:`),
       abortOnBlank: (abortOnBlank !== false),
      });
      const num = parseInt(line || Math.max(0, max || 0));
      if (isNaN(num)) {
       device.tell(`That's not a number.`);
       break;
      }
      else if (min !== undefined && num < min) {
       device.tell(`The number can't be lower than ${min}.`);
       continue;
      }
      else if (max !== undefined && num > max) {
       device.tell(`The number can't be higher than ${max}.`);
       continue;
      }
      else value = num;
     }
     else throw new Error(`optionsMenu error: invalid template type for key ${templateKey}.`);
     if (options[templateKey] === value) device.tell(`No change.`);
     else {
      options[templateKey] = value;
      device.tell(`${name} is now ${stringifyOptionValue(value)}.`);
      if (saveCallback) await saveCallback();
     }
     break;
    }
   }
   else break;
   if (argstr) break;
  }
 };
};
