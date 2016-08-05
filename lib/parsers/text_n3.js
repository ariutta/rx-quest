var N3 = require('n3');
var t = require('../transducers-extra.js');
 
module.exports = function(options) {
  function N3Transduce(options, xf) {
    var that = this;
    options = (typeof options === 'object') ? options : {};
    that.options = options;
    that.xf = xf;

    var parser = N3.Parser(options);
    var triples = [];
    parser.parse(function(error, triple, prefixes) {
      triple && triples.push(triple);
    });
    that.parser = parser;
    that.triples = triples;
  };
  N3Transduce.prototype['@@transducer/init'] = function() {
    return this.xf['@@transducer/init']();
  };
  N3Transduce.prototype['@@transducer/result'] = function(result) {
    var that = this;
    that.parser.end();
    return that.xf['@@transducer/result'](result);
  };
  N3Transduce.prototype['@@transducer/step'] = function(result, input) {
    var that = this;
    var parser = that.parser;
    var triples = that.triples;

    parser.addChunk(input);
    var x = triples.splice(0, triples.length - 1);

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
   * transducer constructor for N3Transduce 
   * @method split
   * @param {Object} options
   * @return {Object} returns a transducer
   */
  function n3Transduce(options) {
    var that = this;
    return function(xf) {
      return new N3Transduce(options, xf);
    };
  };

  function exists(x) {
    return !!x;
  }

  var xf = t.comp(n3Transduce(), t.filter(exists));
  return xf;
};
