var JSONStream = require('JSONStream');
var t = require('../transducers-extra.js');
 
module.exports = function(options) {
  function JSONTransduce(options, xf) {
    var that = this;
    options = (typeof options === 'object') ? options : [true];
    that.options = options;
    that.xf = xf;

    var parser = JSONStream.parse.apply(this, options);
    var parsedChunks = [];

    parser
    .on('data', function(parsedChunk) {
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
    });

    that.parser = parser;
    that.parsedChunks = parsedChunks;
  };
  JSONTransduce.prototype['@@transducer/init'] = function() {
    return this.xf['@@transducer/init']();
  };
  JSONTransduce.prototype['@@transducer/result'] = function(result) {
    return this.xf['@@transducer/result'](result);
  };
  JSONTransduce.prototype['@@transducer/step'] = function(result, input) {
    var that = this;
    var parser = that.parser;
    var parsedChunks = that.parsedChunks;

    parser.write(input);
    var x = parsedChunks.splice(0, parsedChunks.length);

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
   * transducer constructor for JSONTransduce 
   * @method split
   * @param {Object} options
   * @return {Object} returns a transducer
   */
  function jsonTransduce(options) {
    var that = this;
    return function(xf) {
      return new JSONTransduce(options, xf);
    };
  };

  function exists(x) {
    return !!x;
  }

  var xf = t.comp(jsonTransduce(), t.filter(exists));
  return xf;
};
