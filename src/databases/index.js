module.exports = async (main) => {
 const exports = main.exports;

 require('./utils.js')(main);
 require('./database.js')(main);
};
