var conglomerateWorker = require('@conglomerate/worker');
var EventEmitter = require('eventemitter3');

function requests() {
  var args = Array.prototype.slice.call(arguments);
  var emitter = new EventEmitter();

  conglomerateWorker(require('./worker.js'))
  .then(function(worker) {
    worker.addEventListener('message', function(event) {
      var data = event.data;
      var type = data.type;
      var body = data.body;
      if (type === 'data') {
        emitter.emit('data', body);
      } else if (type === 'end') {
        emitter.emit('end', body);
      }
    });

    worker.onerror = function(err) {
      emitter.emit('error', err);
    };

    worker.postMessage({
      args: args
    });
  });

  return emitter;
};

// TODO remove this
window.requests = requests;
module.exports = requests;
