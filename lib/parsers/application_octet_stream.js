var t = require('transducers-js');
 
module.exports = function(options) {
  var noop = function(x) {return x;};
  return t.map(noop);
};

