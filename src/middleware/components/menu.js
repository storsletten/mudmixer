module.exports = main => {
 const exports = main.exports;

 class Menu extends exports.Action {
  constructor(options) {
   super(options);
   const { device, middleware, choices } = options;
   if (choices) {
    // It is important that all keys are strings in the choices map.
    this.choices = choices instanceof Map ? choices : choices.reduce((choices, choice, i) => choices.set((i + 1).toString(), choice), new Map());
    // Columns can be an array of strings.
    // Do not include the key column.
    this.columns = options.columns;
    // columnSeparator is the string you want between each column.
    // It should be only one single character.
    this.columnSeparator = options.columnSeparator || ' ';
    // minPadding is the minimum amount of separation you want between each column.
    this.minPadding = options.minPadding || 1;
    // defaultChoice is the choice that will be returned if the user sends a blank line.
    // Note that choiceIndex and choiceValue will be undefined if defaultChoice is used.
    // If default choice is undefined, then the menu will be rejected if the user sends a blank line.
    this.defaultChoice = options.defaultChoice;
    this.message = options.message;
    this.invalidSelectionMessage = options.invalidSelectionMessage;
    this.prompt = options.prompt;
    // If options.argstr is a string, then the initial menu will not be displayed and argstr will be used as if it was entered as a line in the menu prompt.
    if (typeof options.argstr === 'string') this.execute({ ...options, line: options.argstr });
    else this.printMenu(options);
   }
   else this.reject('noChoices');
  }

  printMenu(args) {
   const { device, middleware } = args;
   const message = args.message || this.message;
   if (message) {
    if (typeof message === 'string') device.tell(message);
    else device.tell(...message);
   }
   const columnSizes = [];
   const rows = [];
   const pushRow = (choiceValue, choice) => rows.push([`[${choice}]`, ...(Array.isArray(choiceValue) ? choiceValue : [choiceValue])]);
   if (this.columns && this.columns.length > 0) rows.push(['', ...this.columns]);
   if (this.matches) this.matches.forEach(({ choice, choiceValue }) => pushRow(choiceValue, choice));
   else this.choices.forEach(pushRow);
   rows.forEach(row => row.forEach((col, i) => {
    while (i >= columnSizes.length) columnSizes.push(0);
    if (col.length > columnSizes[i]) columnSizes[i] = col.length;
   }));
   const columnSeparator = this.columnSeparator.repeat(this.minPadding);
   rows.forEach(row => {
    device.tell(row.map((col, i) => col.padEnd(columnSizes[i], this.columnSeparator)).join(columnSeparator).trimEnd());
   });
   if (this.prompt !== false) device.tell(middleware.messages.prompt);
  }

  execute(args) {
   const { device, middleware, line, options } = args;
   const lcLine = line.trim().toLowerCase();
   if (lcLine === '') {
    if (this.matches) {
     this.matches = undefined;
     this.printMenu(args);
    }
    else if (this.defaultChoice === undefined) {
     device.tell(middleware.messages.invalidSelection);
     this.reject({ ...args, reason: 'blank' });
    }
    else this.resolve({ ...args, choice: this.defaultChoice });
   }
   else if (lcLine === '@abort') {
    device.tell(middleware.messages.commandAborted);
    this.reject({ ...args, reason: 'userAborted' });
   }
   else {
    const lcSpaceLine = ` ${lcLine}`;
    const matches = new Map();
    let choiceIndex = 0;
    for (let [choice, choiceValue] of this.choices) {
     const lcChoice = choice.toLowerCase();
     const lcChoiceValue = (Array.isArray(choiceValue) ? choiceValue.join(' ') : choiceValue).toLowerCase();
     if (lcLine === lcChoice) return this.resolve({ ...args, choice, choiceIndex, choiceValue });
     else if (lcChoiceValue.startsWith(lcLine) || lcChoiceValue.includes(lcSpaceLine)) matches.set(choice, { choice, choiceIndex, choiceValue });
     choiceIndex++;
    }
    if (this.matches) {
     const newMatches = new Map();
     if (matches.size > 0) {
      for (let [choice, match] of this.matches) {
       if (matches.has(choice)) newMatches.set(choice, match);
      }
     }
     if (newMatches.size === 0) {
      this.matches = undefined;
      device.tell(this.invalidSelectionMessage || middleware.messages.invalidSelection);
      this.printMenu(args);
     }
     else if (newMatches.size === 1) this.resolve({ ...args, ...newMatches.values().next().value });
     else {
      if (newMatches.size === this.matches.size) this.printMenu({ ...args, message: `All of the last displayed options match that. Please disambiguate further:` });
      else {
       const matches = this.matches;
       this.matches = newMatches;
       this.printMenu({ ...args, message: `Of those last ${matches.size} displayed options, ${newMatches.size} options match that. Please disambiguate further:` });
      }
     }
    }
    else if (matches.size > 0) {
     if (matches.size === 1) this.resolve({ ...args, ...matches.values().next().value });
     else if (matches.size === this.choices.size) this.printMenu({ ...args, message: `All the options match that.` });
     else {
      this.matches = matches;
      this.printMenu({ ...args, message: `${matches.size} options match that:` });
     }
    }
    else {
     device.tell(this.invalidSelectionMessage || middleware.messages.invalidSelection);
     this.reject({ ...args, reason: 'invalidSelection' });
    }
   }
  }
 }

 exports.Menu = Menu;
};
