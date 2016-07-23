var superagent = require('superagent');

function noop() {}

var input = e.data.input;

var XHR = 'xhr';

var index = 0;

var myresponse = superagent.get(input, noop);
var xhr = myresponse.xhr;

// drawing on code from here:
// https://github.com/jonnyreeves/chunked-request/blob/master/src/impl/xhr.js
function onProgressEvent() {
  var rawChunk = xhr.responseText.substr(index);
  index = xhr.responseText.length;
  postMessage({
    body: rawChunk,
    type: 'next'
  });
}

function onLoadEvent() {
  var xhrJSON = JSON.parse(JSON.stringify(xhr));
  var message = {
    statusCode: xhr.status,
    transport: XHR,
    raw: xhrJSON
  };
  postMessage({
    body: message,
    type: 'completed'
  });
}

function onError(err) {
  // TODO this seems odd
  var err = JSON.parse(JSON.stringify(err));
  var message = {
    statusCode: 0,
    transport: XHR,
    raw: err
  };
  postMessage({
    body: message,
    type: 'error'
  });
  // TODO does this happen automatically?
  close();
}

xhr.addEventListener('progress', onProgressEvent);
xhr.addEventListener('loadend', onLoadEvent);
xhr.addEventListener('error', onError);
