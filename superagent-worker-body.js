// wrapper opening will be automatically inserted here

var _ = require('lodash');
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
var typeMappings = [{
  // CSV
  extensions: [
    'csv',
  ],
  contentTypes: [
    'text/csv',
  ],
  parser: 'csv',
}, {
  // N-Triples
  // https://www.w3.org/TeamSubmission/n3/#mimetype
  extensions: [
    'n3',
  ],
  contentTypes: [
    'text/n3',
  ],
  parser: 'n3',
}, {
  // Turtle
  // https://www.w3.org/TeamSubmission/turtle/#sec-mime
  extensions: [
    'ttl',
  ],
  contentTypes: [
    'text/turtle',
    'application/x-turtle',
  ],
  parser: 'n3',
}, {
  // N-Quads
  // https://www.w3.org/TR/n-quads/
  extensions: [
    'nq',
  ],
  contentTypes: [
    'application/n-quads',
  ],
  parser: 'n3',
}, {
  // TriG
  // https://www.w3.org/TR/trig/
  extensions: [
    'trig',
  ],
  contentTypes: [
    'application/trig',
  ],
  parser: 'n3',
}, {
  // New-line delimited JSON
  extensions: [
    'ndjson',
  ],
  contentTypes: [
    'application/x-ndjson',
    'application/ndjson',
  ],
  parser: '',
}, {
  // TSV
  extensions: [
    'tsv',
  ],
  contentTypes: [
    'text/tab-separated-values',
  ],
  parser: 'tsv',
}, {
  // XML
  extensions: [
    'xml',
  ],
  contentTypes: [
    'application/xml',
    'text/xml',
  ],
  parser: 'xml',
}];

var inputTypeToParserMappings = typeMappings
.reduce(function(acc, x) {
  var parser = x.parser;
  x.extensions.forEach(function(extension) {
    acc[extension] = parser;
  });
  x.contentTypes.forEach(function(contentType) {
    acc[contentType] = parser;
  });
  return acc;
}, {})

var inputTypeToAcceptHeaderMappings = typeMappings
.reduce(function(acc, x) {
  var contentTypes = x.contentTypes;
  var acceptHeader = contentTypes
  .map(function(contentType, index) {
    var min = 0.8;
    var decrement = 0;
    if (index > 0) {
      decrement = (index/Math.max(10, contentTypes.length));
    }
    var qvalue = Math.max(
      (Math.round((1 - decrement) * 10) / 10),
      min
    );
    return contentType + ';q=' + String(qvalue);
  })
  .concat(
      // if we can't get application/ld+json, try just application/json
      contentTypes
      .map(function(contentType, index) {
        var max = 0.7;
        var min = 0.5;
        var decrement = 0;
        if (index > 0) {
          decrement = (index/Math.max(10, contentTypes.length));
        }
        var qvalue = Math.max(
            Math.min(
                (Math.round((1 - decrement) * 10) / 10),
                max
            ),
            min
        );

        var components = contentType.split('/');
        var typeName = components[0];
        var subTypeName = components.pop();
        var baseSubTypeName = subTypeName.split('+').pop();

        if (subTypeName !== baseSubTypeName) {
          return typeName + '/' + baseSubTypeName + ';q=' + String(qvalue);
        }
      })
      .filter(function(x) {
        return _.isString(x);
      })
  )
  .concat(
      // if we can't get application/xml, try application/* or */xml
      contentTypes
      .map(function(contentType, index) {
        var max = 0.4;
        var min = 0.2;
        var decrement = 0;
        if (index > 0) {
          decrement = (index/Math.max(10, contentTypes.length));
        }
        var qvalue = Math.max(
            Math.min(
                (Math.round((1 - decrement) * 10) / 10),
                max
            ),
            min
        );

        var components = contentType.split('/');
        var typeName = components[0];
        var subTypeName = components.pop();

        return typeName + '/*' + ';q=' + String(qvalue) + ',' +
               '*/' + subTypeName + ';q=' + String(qvalue);
      })
  )
  .concat(['*/*;q=0.1'])
  .join(',');

  x.extensions.forEach(function(extension) {
    acc[extension] = acceptHeader;
  });
  x.contentTypes.forEach(function(contentType) {
    acc[contentType] = acceptHeader;
  });
  return acc;
}, {})

// To be used if no applicable parser is available
var noopParser = function(rawChunk, previousChunkSuffix, isFinalChunk) {
  return [[previousChunkSuffix, rawChunk].join('')];
};

var currentParser;
// NOTE: worker-wide side effect
function setParser(contentType, options) {
  var extension = inputTypeToParserMappings[contentType];
  if (extension) {
    importScripts(extension + '.js');
    currentParser = root[extension + 'parser'](options);
  } else {
    currentParser = noopParser;
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
  var acceptHeader;
  var superagentApi = {
    'accept': function(contentType) {
      setParser(contentType);
      acceptHeader = inputTypeToAcceptHeaderMappings[contentType];
    },
    'end': function() {
      var url = input[0];

      if (currentParser === noopParser) {
        // TODO how can I get the response headers
        // to look at the content type?

        // If neither the accept request header nor
        // the content type response header are specified,
        // we make a last ditch effort to determine
        // content type via file name extension.
        var extension = url.split('.').pop();
        setParser(extension);
      }
      var chunkedRequestInput = {
        url: input[0],
        method: 'GET',
        chunkParser: currentParser,
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
          var resultJSON = JSON.parse(JSON.stringify(result));
          postMessage({
            body: resultJSON,
            type: 'complete'
          });
        }
      };
      if (acceptHeader) {
        chunkedRequestInput.headers = {
          'accept': acceptHeader
        };
      }
      chunkedRequest(chunkedRequestInput);
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
