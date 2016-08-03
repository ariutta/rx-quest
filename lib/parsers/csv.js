var csvBase = require('../csv-base.js')
 
module.exports = function(options) {
  options = (typeof options === 'object') ? options : {};
  options.delimiter = options.delimiter || ',';

  return csvBase(options);
};
