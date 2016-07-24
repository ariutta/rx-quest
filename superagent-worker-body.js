// wrapper opening will be automatically inserted here

var chunkedRequest = require('chunked-request').default;
var superagent = require('superagent');

/**
 * Root reference for iframes.
 * from https://github.com/visionmedia/superagent/blob/83892f35fe15676a4567a0eb51eecd096939ad36/lib/client.js#L773
 */

var root;
if (typeof window !== 'undefined') { // Browser window
  root = window;
} else if (typeof self !== 'undefined') { // Web Worker
  root = self;
} else { // Other environments
  console.warn("Using browser-only version of superagent-get-chunked in non-browser environment");
  root = this;
}

function noop() {}

// Highly recommend that these be based on
// IANA entries (http://www.iana.org/assignments/media-types/media-types.xhtml)
// and/or
// W3C Recommendations
var mappingsToExtensions = {
  // CSV
  'csv': 'csv',
  'text/csv': 'csv',
  // N-Triples
  // https://www.w3.org/TeamSubmission/n3/#mimetype
  'n3': 'n3',
  'text/n3': 'n3',
  // Turtle
  // https://www.w3.org/TeamSubmission/turtle/#sec-mime
  'ttl': 'n3',
  'text/turtle': 'n3',
  'application/x-turtle': 'n3',
  // N-Quads
  // https://www.w3.org/TR/n-quads/
  'nq': 'n3',
  'application/n-quads': 'n3',
  // TriG
  // https://www.w3.org/TR/trig/
  'trig': 'n3',
  'application/trig': 'n3',
  // New-line delimited JSON
  'ndjson': 'ndjson',
  'application/ndjson': 'ndjson',
  'application/x-ndjson': 'ndjson',
  // TSV
  'tsv': 'tsv',
  'text/tab-separated-values': 'tsv',
}

// To be used if no applicable parser is available
var noopparser = function(rawChunk, previousChunkSuffix, isFinalChunk) {
  return [[previousChunkSuffix, rawChunk].join('')];
};

var parser;
// NOTE: worker-wide side effect
function setParser(contentType, options) {
  var extension = mappingsToExtensions[contentType];
  if (extension) {
    importScripts(extension + '.js');
    parser = root[extension + 'parser'](options);
  } else {
    parser = noopparser;
  }
}

var callstack = e.data.callstack;

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
  var superagentApi = {
    'accept': setParser,
    'end': function() {
      chunkedRequest({
        url: input[0],
        method: 'GET',
        //headers: { /*...*/ },
        chunkParser: parser,
        onChunk: function(err, parsedChunk) {
          console.log('chunk parsed');
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
          var resultJSON = JSON.parse(JSON.stringify(result));
          postMessage({
            body: resultJSON,
            type: 'complete'
          });
        }
      });
    }
  };

  superagentApi.then = superagentApi.end;

  return superagentApi;
}

//function get(input) {
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

var creationNames = [
  'get',
  'put',
  'post',
  'del',
  'patch'
];

var instance;
callstack.forEach(function(callElement) {
  var name = callElement.name;
  var args = callElement.args;
  if (name === 'get') {
    instance = get(args);
  } else if (creationNames.indexOf(name) > -1) {
    instance = superagent[name].apply(null, args);
  } else if (['end', 'then'].indexOf(name) > -1) {
    if (callstackNames.indexOf('get') > -1) {
      endCb = null;
    }
    instance.end(endCb);
  } else if (instance && instance[name]) {
    instance[name].apply(null, args);
  } else {
    superagent[name].apply(null, args);
  }
});

// wrapper closing will be automatically inserted here
