var EventEmitter = require('eventemitter3');
 
module.exports = function(options) {
  options = (typeof options === 'object') ? options : {};

  var emitter = new EventEmitter();

  emitter.write = function(chunk) {
    emitter.emit('data', chunk);
  };

  emitter.close = function(x) {
    emitter.emit('end', x);
  };

  return emitter;
};
