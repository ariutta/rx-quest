var csvparse = require('js-csvparser');
 
module.exports = function(options) {
  options = (typeof options === 'object') ? options : {};
  options.delimiter = options.delimiter || '\t';
  options.skipEmptyLines = options.hasOwnProperty('skipEmptyLines') ? options.skipEmptyLines : true;
  return function(rawChunk, previousChunkSuffix, isFinalChunk) {
    var lastRawChunkCharacter = rawChunk[rawChunk.length - 1];
    var runningRawChunk = [previousChunkSuffix, rawChunk].join('');
    if (isFinalChunk) {
      return [csvparse(runningRawChunk, options).data];
    }

    var csvparseResult = csvparse(runningRawChunk, options);
    var csvparseResultData = csvparseResult.data;
    var csvparseResultOptions = csvparseResult.options;

    if (csvparseResultOptions.lineEnding === lastRawChunkCharacter) {
      return [csvparseResultData];
    }

    var chunkSuffix = csvparseResultData.pop();
    var parsedChunk = csvparseResultData;
    return [parsedChunk, chunkSuffix];
  };
};
