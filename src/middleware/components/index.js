module.exports = async (main) => {
 const exports = main.exports;

 ['confirm', 'localEdit', 'menu', 'optionsMenu', 'prompt', 'suspend'].forEach(name => require(`./${name}.js`)(main));
};
