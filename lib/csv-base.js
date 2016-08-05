var EventEmitter = require('eventemitter3');
var csvparse = require('js-csvparser');
var isArray = require('lodash/isArray');
var t = require('./transducers-extra.js');
var zipObject = require('lodash/zipObject');

module.exports = function(options) {
  options = (typeof options === 'object') ? options : {};
  // NOTE: I'm making sure to skip lines here, because I think it's
  // possible not skipping lines will mess up my chunking.
  options.skipEmptyLines = options.hasOwnProperty('skipEmptyLines') ?
    options.skipEmptyLines : true;

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

  function CSVTransduce(xf) {
    var that = this;
    that.xf = xf;
  };
  CSVTransduce.prototype['@@transducer/init'] = function() {
    return this.xf['@@transducer/init']();
  };
  CSVTransduce.prototype['@@transducer/result'] = function(result) {
    return this.xf['@@transducer/result'](result);
  };
  CSVTransduce.prototype['@@transducer/step'] = function(result, input) {
    var that = this;
    var previousChunkSuffix = that.previousChunkSuffix;

    var lastRawChunkCharacter = input[input.length - 1];
    var runningRawChunk = [previousChunkSuffix, input].join('');

    var csvparseResult = csvparse(runningRawChunk, options);
    var csvparseResultData = csvparseResult.data;
    var csvparseResultOptions = csvparseResult.options;

    if (csvparseResultOptions.lineEnding === lastRawChunkCharacter) {
      that.previousChunkSuffix = null;
    } else {
      that.previousChunkSuffix = csvparseResultData.pop();
    }

    var parsedChunk = csvparseResultData;
    var headeredChunk = addHeaders(parsedChunk);
    var x = headeredChunk;

    if (x.length > 0) {
      var xf = that.xf;
      return x.reduce(function(acc, line) {
        return xf['@@transducer/step'](acc, line); 
      }, result);
    } else {
      return result;
    }
  };

  /**
   * transducer constructor for CSVTransduce 
   * @method split
   * @param {Object} options
   * @return {Object} returns a transducer
   */
  function csvTransduce() {
    var that = this;
    return function(xf) {
      return new CSVTransduce(xf);
    };
  };

  function exists(x) {
    return !!x;
  }

  var xf = t.comp(csvTransduce(), t.filter(exists));
  return xf;
};
