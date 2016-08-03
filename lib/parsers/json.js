var JSONStream = require('JSONStream');

module.exports = function(options) {
  //options = (typeof options === 'object') ? options : {};
  options = options || [true];
  var emitter = JSONStream.parse.apply(this, options);

  emitter.close = function() {
    emitter.emit('end');
  };

  return emitter;
};
