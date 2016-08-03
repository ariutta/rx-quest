var ee = require('event-emitter');
var requests = require('requests');
var t = require('./transducers-extra.js');

//requests.prototype.pipe = function() {
//  var that = this;
//
//  that.on('data', function(chunk) {
//    writeThrough(chunk);
//  })
//  .on('end', function(end) {
//    endThrough(end);
//  });
//
//  var ts = through(writeThrough, endThrough);
//
//  that.on('error', function(err) {
//    console.error(err.message);
//    console.error(err.stack);
//    ts.emit('error', err);
//  });
//
//  return ts;
//};

function Transform(push) {
  this.push = push;
}

Transform.prototype['@@transducer/init'] = function () {
  return this.push;
};

Transform.prototype['@@transducer/result'] = function(push) {
  // Don't push nil here. Otherwise, we can't catch errors from `result`
  // and propagate them. The `transduce` implementation will do it.
  return push;
};

Transform.prototype['@@transducer/step'] = function(push, input) {
  push(null, input);
  return push;
};

requests.prototype.transduce = function transduce(xf) {
  var that = this;
  var emitter = ee();

  var transform = null;
  var memo = null;

  function push(err, x) {
    if (err) {
      console.log('err135');
      console.error(err.message);
      console.error(err.stack);
    }
    if (x !== 'nil') {
      emitter.emit('data', x);
    }
  }

  that.on('data', function(x) {
    if (transform === null) {
      transform = xf(new Transform(push));
      memo = transform['@@transducer/init']();
    }

    var res = runStep(push, memo, x);

    if (!res) {
      return;
    }

    memo = res;
    if (memo['@@transducer/reduced']) {
      runResult(memo['@@transducer/value']);
    }
  })
  .on('end', function(err) {
    if (err) {
      console.error(err.message);
      console.error(err.stack);
      // TODO how to handle errors?
      //throw err;
      emitter.emit('error', err);
    }
    emitter.emit('end');
    runResult(push, memo);
  });

  function runResult(push, _memo) {
    try {
      transform['@@transducer/result'](_memo);
    } catch (e) {
      push(e);
    }
    push(null, 'nil');
  }

  function runStep(push, _memo, x) {
    try {
      return transform['@@transducer/step'](_memo, x);
    } catch (e) {
      push(e);
      push(null, 'nil');
      return null;
    }
  }

  return emitter;
};

module.exports = requests;
