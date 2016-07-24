var N3 = require('n3');
 
module.exports = function(options) {
  options = (typeof options === 'object') ? options : {};

  var parser = N3.Parser();
  var triples;
  //var previousTripleCount = triples.length;
  parser.parse(function(error, triple, prefixes) {
    triple && triples.push(triple);
  });

  return function(rawChunk, previousChunkSuffix, isFinalChunk) {
    triples = [];
    var runningRawChunk = [previousChunkSuffix, rawChunk].join('');
    parser.addChunk(runningRawChunk);
    console.log('triples15');
    console.log(triples);
    //var currentTripleCount = triples.length;
    //var newTriples = triples.slice(previousTripleCount - 1, currentTripleCount);
    //console.log('newTriples');
    //console.log(newTriples);
    if (isFinalChunk) {
      parser.end();
    }

    //return [newTriples];
    return [triples];
  };
};
