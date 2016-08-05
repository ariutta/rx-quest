var ndjson = require('ndjson')
var t = require('../transducers-extra.js');
 
module.exports = function(options) {
  function NDJSONTransduce(options, xf) {
    var that = this;
    options = (typeof options === 'object') ? options : {};
    that.options = options;
    that.xf = xf;

    var parser = ndjson.parse(options);
    var parsedChunks = [];

    parser
    .on('data', function(parsedChunk) {
      console.log('parsedChunk');
      console.log(parsedChunk);
      parsedChunk && parsedChunks.push(parsedChunk);
    })
    .on('error', function(err) {
      console.error(err.message);
      console.error(err.stack);
    })
    .on('end', function(err) {
      // TODO how to handle errors?
      if (err) {
        console.error(err.message);
        console.error(err.stack);
        throw err;
      }
      //currentParser.close();
    });

    that.parser = parser;
    that.parsedChunks = parsedChunks;
  };
  NDJSONTransduce.prototype['@@transducer/init'] = function() {
    return this.xf['@@transducer/init']();
  };
  NDJSONTransduce.prototype['@@transducer/result'] = function(result) {
    var that = this;
    that.parser.close();
    return that.xf['@@transducer/result'](result);
  };
  NDJSONTransduce.prototype['@@transducer/step'] = function(result, input) {
    console.log('input');
    console.log(input);
    console.log('result');
    console.log(result);
    var that = this;
    var parser = that.parser;
    var parsedChunks = that.parsedChunks;

    parser.write(input);
    var x = parsedChunks.splice(0, parsedChunks.length - 1);

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
   * transducer constructor for NDJSONTransduce 
   * @method split
   * @param {Object} options
   * @return {Object} returns a transducer
   */
  function ndjsonTransduce(options) {
    var that = this;
    return function(xf) {
      return new NDJSONTransduce(options, xf);
    };
  };

  function exists(x) {
    return !!x;
  }

  var xf = t.comp(ndjsonTransduce(), t.filter(exists));
  return xf;
};
