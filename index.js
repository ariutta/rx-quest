var superagent = window.superagent || {};
if (!window.superagent) {
  window.superagent = superagent;
}

superagent.getChunked = function(input, next, error, complete) {
  var requestWorker = new Worker('superagent-get-chunked-worker.min.js');
  requestWorker.onmessage = function(oEvent) {
    var data = oEvent.data;
    var type = data.type;
    var body = data.body;
    if (type === 'next') {
      next(body);
    } else if (type === 'complete') {
      complete();
    }
  };

  requestWorker.onerror = error;

  requestWorker.postMessage({
    input: input
  });
};

module.exports = superagent;
