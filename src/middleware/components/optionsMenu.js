module.exports = main => {
 const exports = main.exports;

 const stringifyOptionValue = val => {
  if (typeof val === 'boolean') return val ? 'On' : 'Off';
  else if (typeof val === 'number') return val.toString();
  else if (typeof val === 'string') {
   if (val.length > 75) return `... ${val.slice(-71)}`;
   else return val;
  }
 };

 exports.optionsMenu = async ({ device, middleware, argstr, options, template, saveCallback }) => {
  const templateKeys = Object.keys(template);
  while (!device.destroyed) {
   let templateKey;
   if (argstr) {
    if (argstr.match(/^\d+$/)) {
     const num = parseInt(argstr);
     if (isNaN(num) || num < 1 || num > templateKeys.length) {
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
    const { name, type, message, abortOnBlank } = template[templateKey];
    let value;
    if (type === 'string') {
     value = await middleware.prompt({
      message: (message || `Enter a value for the ${name} option:`),
      abortOnBlank,
     });
    }
    else if (type === 'boolean') value = !options[templateKey];
    else if (type === 'number') {
     const line = await middleware.prompt({
      message: (message || `Enter a value for the ${name} option:`),
     });
     const num = parseInt(line);
     if (isNaN(num)) {
      device.tell(`That's not a number.`);
      break;
     }
     else value = num;
    }
    else throw new Error(`optionsMenu error: invalid template type for key ${templateKey}.`);
    if (options[templateKey] !== value) {
     options[templateKey] = value;
     device.tell(`${name} is now ${stringifyOptionValue(value)}.`);
     if (saveCallback) await saveCallback();
    }
   }
   else break;
   if (argstr) break;
  }
 };
};
