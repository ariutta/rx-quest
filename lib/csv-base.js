var EventEmitter = require('eventemitter3');
var csvparse = require('js-csvparser');
var isArray = require('lodash/isArray');
var zipObject = require('lodash/zipObject');
 
module.exports = function(options) {
  options = (typeof options === 'object') ? options : {};
  // NOTE: I'm making sure to skip lines here, because I think it's
  // possible not skipping lines will mess up my chunking.
  options.skipEmptyLines = options.hasOwnProperty('skipEmptyLines') ? options.skipEmptyLines : true;
  var headersOption = options.headers;
  var headers;
  if (isArray(headersOption)) {
    headers = headersOption;
  }

  // NOTE: side effect when setting headers
  function addHeaders(parsedChunk) {
    if (!headersOption) {
      return parsedChunk;
    }

    // NOTE: we want to determine whether headersOption is true, not just truthy
    if (!headers && headersOption === true) {
      headers = parsedChunk.shift();
    }

    return parsedChunk
    .map(function(rowArray) {
      return zipObject(headers, rowArray)
    });
  }

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
    var headeredChunk = addHeaders(parsedChunk);
    emitter.emit('data', headeredChunk);
  };

  emitter.close = function() {
    var parsedChunk = csvparse(runningRawChunk, options).data;
    if (parsedChunk.length > 0) {
      var headeredChunk = addHeaders(parsedChunk);
      emitter.emit('data', headeredChunk);
    }
    emitter.emit('end');
  };

  return emitter;
};
