module.exports = async (main) => {
 const exports = main.exports;

 require('./utils.js')(main);
 require('./action.js')(main);
 require('./triggers.js')(main);
 require('./middleware.js')(main);

 require('./components/index.js')(main);
};
