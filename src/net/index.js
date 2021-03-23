module.exports = async (main) => {
 const exports = main.exports;

 ['device', 'client', 'server', 'listener', 'utils'].forEach(name => require(`./${name}.js`)(main));
};
