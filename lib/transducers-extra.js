var t = require('transducers-js');

var map    = t.map,
    filter = t.filter,
    comp   = t.comp,
    into   = t.into;

var TRANSDUCERS_DEV = true;

//// this is a transformer. it appears to be
//// a way to take any function and express
//// it in terms of reduce.
/**
 * @constructor
 */
function Split(pred, xf) {
  var that = this;
  that.pred = pred;
  that.remainder = '';
  that.xf = xf;
};
Split.prototype['@@transducer/init'] = function() {
  return this.xf['@@transducer/init']();
};
Split.prototype['@@transducer/result'] = function(result) {
    return this.xf['@@transducer/result'](result);
};
Split.prototype['@@transducer/step'] = function(result, input) {
  var that = this;
  var pred = that.pred;

  var previousRemainder = that.remainder;
  var runningInput = previousRemainder + input;
  var lines = runningInput.split(pred);
  that.remainder = lines.pop();
  if (lines.length > 0) {
    var xf = that.xf;
    return lines.reduce(function(acc, line) {
      // TODO I would like to define stepFn once outside this reduction,
      // but it appears we need to bind a context somehow
      // to make stepFn work, but nothing I tried worked.
      // I can't even get stepFn to work when I define it inside this reduction.
      //var stepFn = xf['@@transducer/step'];
      //return stepFn(acc, line); 

      // But this does work.
      return xf['@@transducer/step'](acc, line); 
    }, result);
  } else {
    return result;
  }
};

/**
 * Splitting transducer constructor
 * @method split
 * @param {Function} pred a predicate string
 * @return {Object} returns a spliting transducer
 */
function split(pred) {
  var that = this;
  if(TRANSDUCERS_DEV && (typeof pred !== 'string')) {
    throw new Error('split must be given a string');
  } else {
    return function(xf) {
      return new Split(pred, xf);
    };
  }
};

t.split = split;

module.exports = t;
