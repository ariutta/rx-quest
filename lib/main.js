var EventEmitter = require('eventemitter3');

function requests() {
  var args = Array.prototype.slice.call(arguments);
  var emitter = new EventEmitter();

  var requestsWorker = new Worker('superagent-get-chunked-worker.min.js');

  requestsWorker.onmessage = function(oEvent) {
    var data = oEvent.data;
    var type = data.type;
    var body = data.body;
    if (type === 'data') {
      emitter.emit('data', body);
    } else if (type === 'end') {
      emitter.emit('end', body);
    }
  };

  requestsWorker.onerror = function(err) {
    emitter.emit('error', err);
  };

  requestsWorker.postMessage({
    args: args
  });

  return emitter;
};

// TODO remove this
window.requests = requests;
module.exports = requests;
