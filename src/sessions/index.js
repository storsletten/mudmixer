module.exports = async (main) => {
 const exports = main.exports;

 require('./utils.js')(main);
 require('./session.js')(main);
};
