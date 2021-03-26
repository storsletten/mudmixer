module.exports = async (main) => {
 const exports = main.exports;

 ['confirm', 'localEdit', 'menu', 'optionsMenu', 'prompt', 'loginPrompt', 'suspend', 'selectServer'].forEach(name => require(`./${name}.js`)(main));
};
