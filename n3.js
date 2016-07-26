var EventEmitter = require('eventemitter3');
var N3 = require('n3');
 
module.exports = function(options) {
  options = (typeof options === 'object') ? options : {};

  var parser = N3.Parser();
  var triples = [];
  parser.parse(function(error, triple, prefixes) {
    triple && triples.push(triple);
  });

  var emitter = new EventEmitter();

  emitter.write = function(chunk) {
    parser.addChunk(chunk);
    var newTriples = triples.splice(0, triples.length - 1);
    emitter.emit('data', newTriples);
  };

  emitter.close = function() {
    parser.end();
    if (triples.length > 0) {
      emitter.emit('data', triples);
    }
    emitter.emit('end');
  };

  return emitter;
};
