var Emitter = require('component-emitter');

var Superagent = function() {
  var args = Array.prototype.slice.call(arguments);

  this.callstack = [];

  if (args.length) {
    var callElement = {};
    callElement.name = 'get';
    callElement.args = args;
    this.callstack.push(callElement);
  }

};

var methods = [
  'post',
  'put',
  'get',
  'accept',
  'send',
  'set',
  'head',
  'del',
  'query',
  'type',
  'serialize',
  'buffer',
  'parse',
  'attach',
  'field',
  'withCredentials',
  //'on',
  'auth',
  'timeout',
];

methods.forEach(function(method) {
  Superagent.prototype[method] = function(name) {
    var args = Array.prototype.slice.call(arguments);
    var callElement = {};
    callElement.name = method;
    callElement.args = args;
    this.callstack.push(callElement);
    console.log('callstack');
    console.log(this.callstack);
    return this;
  };
});

Superagent.prototype.end = function() {
  var that = this;
  var callstack = that.callstack;

  var requestWorker = new Worker('superagent-get-chunked-worker.min.js');
  requestWorker.onmessage = function(oEvent) {
    var data = oEvent.data;
    var type = data.type;
    var body = data.body;
    if (type === 'next') {
      that.emit('data', body);
    } else if (type === 'complete') {
      that.emit('end', body);
    }
  };

  requestWorker.onerror = function(err) {
    that.emit('error', err);
  };

  requestWorker.postMessage({
    callstack: callstack
  });
};

Superagent.prototype.then = Superagent.prototype.end;

Emitter(Superagent.prototype);

var request = new Superagent();

window.request = request;
module.exports = request;
