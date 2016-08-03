// wrapper opening will be automatically inserted here

var _ = require('lodash');
var ee = require('event-emitter');
var requests = require('./transducing-http-client.js');

/**
 * Root reference for iframes.
 * from https://github.com/visionmedia/superagent/blob/
 *      83892f35fe15676a4567a0eb51eecd096939ad36/lib/client.js#L773
 */

var root;
if (typeof window !== 'undefined') { // Browser window
  root = window;
} else if (typeof self !== 'undefined') { // Web Worker
  root = self;
} else { // Other environments
  console.warn('Using browser-only version of superagent-get-chunked in non-browser environment');
  root = this;
}

/**
 * Note: must be actual content type, not a file extension
 *
 * @returns {String} parserName
 */
var getParserNameByContentType = function(contentType) {
  return contentType.replace(/\W/g, '_');
};

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
  parser: 'text_csv',
}, {
  // N-Triples
  // https://www.w3.org/TeamSubmission/n3/#mimetype
  extensions: [
    'n3',
  ],
  contentTypes: [
    'text/n3',
  ],
  parser: 'text_n3',
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
  parser: 'text_n3',
}, {
  // N-Quads
  // https://www.w3.org/TR/n-quads/
  extensions: [
    'nq',
  ],
  contentTypes: [
    'application/n-quads',
  ],
  parser: 'text_n3',
}, {
  // TriG
  // https://www.w3.org/TR/trig/
  extensions: [
    'trig',
  ],
  contentTypes: [
    'application/trig',
  ],
  parser: 'text_n3',
}, {
  // JSON
  extensions: [
    'json',
  ],
  contentTypes: [
    'application/json',
  ],
  parser: 'application_json',
}, {
  // New-line delimited JSON
  extensions: [
    'ndjson',
  ],
  contentTypes: [
    'application/x-ndjson',
    'application/ndjson',
  ],
  parser: 'application_x_ndjson',
}, {
  // TSV
  extensions: [
    'tsv',
  ],
  contentTypes: [
    'text/tab-separated-values',
  ],
  parser: 'text_tab_separated_values',
}, {
  // XML
  extensions: [
    'xml',
  ],
  contentTypes: [
    'application/xml',
    'text/xml',
  ],
  parser: 'application_xml',
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

var currentParser;
var currentContentType;
var usingNoopParser;
// NOTE: two worker-wide side effects
function setParser(contentType, options) {
  var parserName = inputTypeToParserMappings[contentType];
  if (!parserName) {
    // To be used if no applicable parser is available
    parserName = 'noop';
    usingNoopParser = true;
  } else {
    currentContentType = contentType;
    usingNoopParser = false;
  }
  importScripts(parserName + '.js');
  currentParser = root[parserName](options);
}

var args = e.data.args;
var url = args[0];
var options = args[1] || {};

var headers = options.headers || {};
var userProvidedAcceptHeader = headers['Accept'];
if (userProvidedAcceptHeader) {
  setParser(userProvidedAcceptHeader);
  options.headers['Accept'] = inputTypeToAcceptHeaderMappings[userProvidedAcceptHeader];
}

if (usingNoopParser) {
  // TODO how can I get the response headers
  // to look at the content type?

  // If neither the accept request header nor
  // the content type response header are specified,
  // we make a last ditch effort to determine
  // content type via file name extension.
  var extension = url.split('.').pop();
  if (extension) {
    setParser(extension);
    options.headers['Accept'] = inputTypeToAcceptHeaderMappings[extension];
  }
}

var parserOption = options.parser;
if (parserOption) {
  setParser(parserOption.type, parserOption.options);
}

//var n3Xf = require('./parsers/n3-transduce.js')(options);
requests(url, options)
.on('before', function (socket) {
  console.log('socketbefore');
  console.log(socket);
})
.on('send', function (socket) {
  console.log('socketsend');
  console.log(socket);
  if (!socket || !socket.hasOwnProperty('response')) {
    return;
  }

  console.log('socket.response.headers');
  console.log(socket.response.headers);
  var contentTypeAndEncoding = socket.response.headers.get('Content-Type');
  console.log('socket.response.headers.get("Content-Type")');
  console.log(contentTypeAndEncoding);
  if (contentTypeAndEncoding) {
    var contentType = contentTypeAndEncoding.split(';')[0];
    console.log('contentType');
    console.log(contentType);
    console.log('currentContentType');
    console.log(currentContentType);
    if (!parserOption && !!contentType && contentType !== currentContentType) {
      // TODO it appears to be too late to change the parser here, because
      // the response is already coming in. But it is supposed to be possible with fetch!
      //setParser(contentType);
      console.log('currentContentType after');
      console.log(currentContentType);
    }
  }
})
.transduce(currentParser)
.on('data', function(parsedChunk) {
  console.log('parsedChunk597-transduced');
  console.log(parsedChunk);
  var dataString = JSON.stringify(parsedChunk);
  postMessage({
    body: parsedChunk,
    type: 'data'
  });
})
.on('error', function(err) {
  console.log('error601-transduced');
  console.error(err.message);
  console.error(err.stack);
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
})
.on('end', function(x) {
  console.log('end615-transduced');
  postMessage({
    // TODO will x ever be anything?
    result: x,
    type: 'end'
  });
});

//.on('data', function (chunk) {
//  currentParser.write(chunk);
//})
//.on('end', function(err) {
//  if (err) {
//    console.error(err.message);
//    console.error(err.stack);
//    throw err;
//    // TODO how to handle errors?
//    //currentParser.emit('error', err);
//  }
//  currentParser.close();
//});
//
//currentParser
//.on('data', function(parsedChunk) {
//  var dataString = JSON.stringify(parsedChunk);
//  postMessage({
//    body: parsedChunk,
//    type: 'data'
//  });
//})
//.on('error', function(err) {
//  console.error(err.message);
//  console.error(err.stack);
//  // TODO this seems odd
//  var errJSON = {};
//  errJSON.message = err.message;
//  errJSON.stack = JSON.parse(JSON.stringify(err.stack));
//  postMessage({
//    body: errJSON,
//    type: 'error'
//  });
//  // TODO does this happen automatically?
//  return close();
//})
//.on('end', function(x) {
//  postMessage({
//    // TODO will x ever be anything?
//    result: x,
//    type: 'end'
//  });
//});

// wrapper closing will be automatically inserted here
