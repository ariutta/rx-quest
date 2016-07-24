var N3 = require('n3');
 
module.exports = function(options) {
  options = (typeof options === 'object') ? options : {};

  var parser = N3.Parser();
  var triples;
  parser.parse(function(error, triple, prefixes) {
    triple && triples.push(triple);
  });

  return function(rawChunk, previousChunkSuffix, isFinalChunk) {
    // TODO is this going to miss any data?
    triples = [];
    var runningRawChunk = [previousChunkSuffix, rawChunk].join('');
    parser.addChunk(runningRawChunk);
    if (isFinalChunk) {
      parser.end();
    }

    return [triples];
  };
};
