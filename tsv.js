var EventEmitter = require('eventemitter3');
var csvparse = require('js-csvparser');
 
module.exports = function(options) {
  options = (typeof options === 'object') ? options : {};
  options.delimiter = options.delimiter || '\t';
  options.skipEmptyLines = options.hasOwnProperty('skipEmptyLines') ? options.skipEmptyLines : true;

  var emitter = new EventEmitter();

  var previousChunkSuffix;
  var runningRawChunk;
  emitter.write = function(chunk) {
    var lastRawChunkCharacter = chunk[chunk.length - 1];
    runningRawChunk = [previousChunkSuffix, chunk].join('');

    var csvparseResult = csvparse(runningRawChunk, options);
    var csvparseResultData = csvparseResult.data;
    var csvparseResultOptions = csvparseResult.options;

    if (csvparseResultOptions.lineEnding === lastRawChunkCharacter) {
      previousChunkSuffix = null;
    } else {
      previousChunkSuffix = csvparseResultData.pop();
    }

    var parsedChunk = csvparseResultData;
    emitter.emit('data', parsedChunk);
  };

  emitter.close = function() {
    var parsedChunk = csvparse(runningRawChunk, options).data;
    if (parsedChunk.length > 0) {
      emitter.emit('data', parsedChunk);
    }
    emitter.emit('end');
  };

  return emitter;
};
