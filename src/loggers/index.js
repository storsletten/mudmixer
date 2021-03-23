module.exports = async (main) => {
 const exports = main.exports;

 require('./utils.js')(main);
 require('./logger.js')(main);
};
