var superagent = require('superagent');

var chunkedRequest = require('chunked-request').default;

function noop() {}

var callstack = e.data.callstack;

console.log('callstack');
console.log(callstack);

//function post(input) {
//  console.log('input24');
//  console.log(input);
//
//  chunkedRequest({
//    url: input,
//    method: 'POST',
//    headers: { /*...*/ },
//    body: JSON.stringify({ /*...*/ }),
//    credentials: 'include',
//    chunkParser(rawChunk) { /*...*/ },
//    onChunk(err, parsedChunk) { /*...*/ },
//    onComplete(result) { /*...*/ }
//  });
//});

function get(input) {
  console.log('input24');
  console.log(input);

  chunkedRequest({
    url: input[0],
    method: 'GET',
    //headers: { /*...*/ },
    onChunk: function(err, parsedChunk) {
      if (err) {
        console.error('err56');
        console.error(err);
        // TODO this seems odd
        var errJSON = {};
        errJSON.message = err.message;
        errJSON.stack = JSON.parse(JSON.stringify(err.stack));
        postMessage({
          body: errJSON,
          type: 'error'
        });
        // TODO does this happen automatically?
        return close();
      }

      postMessage({
        body: parsedChunk,
        type: 'next'
      });
    },
    onComplete: function(result) {
      postMessage({
        body: result,
        type: 'completed'
      });
    }
  });
}

//function get(input) {
//  console.log('input24');
//  console.log(input);
//  var XHR = 'xhr';
//
//  var index = 0;
//
//  var myresponse = superagent.get(input, noop);
//  var xhr = myresponse.xhr;
//
//  // drawing on code from here:
//  // https://github.com/jonnyreeves/chunked-request/blob/master/src/impl/xhr.js
//  function onProgressEvent() {
//    var rawChunk = xhr.responseText.substr(index);
//    console.log('rawChunk38');
//    console.log(rawChunk);
//    index = xhr.responseText.length;
//    postMessage({
//      body: rawChunk,
//      type: 'next'
//    });
//  }
//
//  function onLoadEvent() {
//    var xhrJSON = JSON.parse(JSON.stringify(xhr));
//    var message = {
//      statusCode: xhr.status,
//      transport: XHR,
//      raw: xhrJSON
//    };
//    postMessage({
//      body: message,
//      type: 'completed'
//    });
//  }
//
//  function onError(err) {
//    console.error('err56');
//    console.error(err);
//    // TODO this seems odd
//    err = JSON.parse(JSON.stringify(err));
//    var message = {
//      statusCode: 0,
//      transport: XHR,
//      raw: err
//    };
//    postMessage({
//      body: message,
//      type: 'error'
//    });
//    // TODO does this happen automatically?
//    close();
//  }
//
//  xhr.addEventListener('progress', onProgressEvent);
//  xhr.addEventListener('loadend', onLoadEvent);
//  xhr.addEventListener('error', onError);
//}

function endCb(result) {
  var resultJSON = JSON.parse(JSON.stringify(result));
  postMessage({
    body: resultJSON,
    type: 'completed'
  });
}

//superagent.on('error', function onError(err) {
//  // TODO this seems odd
//  err = JSON.parse(JSON.stringify(err));
//  var message = {
//    statusCode: 0,
//    raw: err
//  };
//  postMessage({
//    body: message,
//    type: 'error'
//  });
//  // TODO does this happen automatically?
//  close();
//});

var callstackNames = callstack.map(function(callElement) {
  return callElement.name;
});
callstack.forEach(function(callElement) {
  var name = callElement.name;
  var args = callElement.args;
  if (name === 'get') {
    get(args);
  } else if (['end', 'then'].indexOf(name) > -1 && callstackNames.indexOf('get') === -1) {
    superagent.end(endCb);
  } else {
    superagent[name].apply(null, args);
  }
});
