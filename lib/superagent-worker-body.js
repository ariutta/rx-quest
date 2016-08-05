// wrapper opening will be automatically inserted here

/* global e, importScripts */

var _ = require('lodash');
// notice this is NOT the NPM bitmask package
var Bitmask = require('bitmask');
var ee = require('event-emitter');
var orderedTags = require('./orderedTags.json');
var inputTypeToParserBitmaskMappings = require('./inputTypeToParserBitmaskMappings.json');
var requests = require('./transducing-http-client.js');

// NOTE: this is necessary because it makes Bitmask match
// what it was when inputTypeToParserBitmaskMappings was created.
orderedTags.forEach(function(tag) {
  new Bitmask(tag);
});

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
 * Convert a parser's content type to a string safe for
 * use in a filename or a JavaScript variable.
 * Note: must be actual content type, not a file extension.
 *
 * @returns {String} name of parser
 */
var convertContentTypeToParserName = function(contentType) {
  return contentType.replace(/\W/g, '_');
};

/**
 * Convert a parser's content type to a string that represents
 * the filename of the corresponding parser.
 * Note: must be actual content type, not a file extension.
 *
 * @returns {String} filename of parser
 */
var convertContentTypeToFilename = function(contentType) {
  var parserName = convertContentTypeToParserName(contentType);
  return parserName + '.js';
};

var getParserContentType = function(inputType, acceptHeader, filepath) {
  var matchedInputType;
  if (inputType) {
    matchedInputType = getParserContentTypeFromInputType(inputType);
  } else if (acceptHeader) {
    matchedInputType = getParserContentTypeFromInputType(acceptHeader);
  } else {
    // If neither the accept request header nor
    // the content type response header are specified,
    // we make a last attempt to infer content type,
    // based on the file name extension.
    var extension = filepath.split('.').pop();
    if (extension) {
      matchedInputType = getParserContentTypeFromInputType(extension);
    } else {
      // if no parser is specified or able to be inferred
      matchedInputType = 'application/octet-stream';
    }
  }
  return matchedInputType;
};

var getParserContentTypeFromInputType = function(inputType) {
  var inputTypeToParserMask = new Bitmask(inputType);

  var parserContentTypes = inputTypeToParserMask.filter(
      inputTypeToParserBitmaskMappings, 'any', 'tags');

  var parserContentType;
  if (parserContentTypes.length > 0) {
    parserContentType = parserContentTypes[0].parser;
  } else {
    parserContentType = 'application/octet-stream';
  }

  return parserContentType;
};

var inputTypeToAcceptHeaderMappings = inputTypeToParserBitmaskMappings
.reduce(function(acc, x) {
  var parserContentType = x.parser;

  var acceptHeaderElements = [];
  acceptHeaderElements.push(parserContentType + ';q=1');

  var components = parserContentType.split('/');
  var typeName = components[0];
  var subTypeName = components.pop();

  // e.g., if we can't get application/x-ndjson, try just application/ndjson
  var standardSubTypeName = subTypeName.replace(/^x-/, '');
  if (standardSubTypeName !== subTypeName) {
    acceptHeaderElements.push(typeName + '/' + standardSubTypeName + ';q=0.8');
  }

  // e.g., if we can't get application/ld+json, try just application/json
  var baseSubTypeName = subTypeName.split('+').pop();
  if (subTypeName !== baseSubTypeName) {
    acceptHeaderElements.push(typeName + '/' + baseSubTypeName + ';q=0.7');
  }

  // Wildcard first part, e.g., "*/xml" or "*/png".
  acceptHeaderElements.push('*/' + subTypeName + ';q=0.5');
  if (subTypeName !== baseSubTypeName) {
    acceptHeaderElements.push('*/' + baseSubTypeName + ';q=0.3');
  }
  if (standardSubTypeName !== subTypeName) {
    acceptHeaderElements.push('*/' + standardSubTypeName + ';q=0.3');
  }
  // Wildcard second part only for the ones where it makes sense,
  // e.g., "image/*" is worth using, but "application/*" is not.
  if (['image'].indexOf(typeName) > -1) {
    acceptHeaderElements.push(typeName + '/*' + ';q=0.3');
  }

  // Finally, accept something rather than nothing
  acceptHeaderElements.push('*/*;q=0.1');

  acc[parserContentType] = acceptHeaderElements.join(',');

  return acc;
}, {});

var currentParser;
var currentParserContentType;
// NOTE: two worker-wide side effects
var setParser = function(inputType, options) {
  var parserContentType = getParserContentTypeFromInputType(inputType);
  var parserName = convertContentTypeToParserName(parserContentType);
  var parserFilename = convertContentTypeToFilename(parserContentType);
  currentParserContentType = parserContentType;
  importScripts(parserFilename);
  currentParser = root[parserName](options);
};

var args = e.data.args;
var url = args[0];
var options = args[1] || {};

var parserOption = options.parser || {};

var headers = options.headers || {};
var userProvidedAcceptHeader = headers['Accept'];

var currentInputType = getParserContentType(
    parserOption.type,
    userProvidedAcceptHeader,
    url
);

setParser(currentInputType, parserOption.options);

if (userProvidedAcceptHeader) {
  var acceptContentType;
  // if it's a proper content type, e.g., "text/n3"
  if (userProvidedAcceptHeader.indexOf('/') > 0) {
    acceptContentType = userProvidedAcceptHeader;
  } else {
    // if it's a file extension, e.g, "n3"
    acceptContentType = getParserContentTypeFromInputType(userProvidedAcceptHeader);
  }
  options.headers['Accept'] = inputTypeToAcceptHeaderMappings[acceptContentType];
} else if (!!parserOption) {
  options.headers['Accept'] = inputTypeToAcceptHeaderMappings[currentParserContentType];
}

var nP = getParserContentTypeFromInputType('application/x-ndjson');
console.log('nP');
console.log(nP);
console.log('currentParserContentType');
console.log(currentParserContentType);

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
    var parserContentType = getParserContentTypeFromInputType(contentType);
    console.log('parserContentType');
    console.log(parserContentType);
    console.log('currentParserContentType');
    console.log(currentParserContentType);
    if (!parserOption && !!contentType && (parserContentType !== currentParserContentType)) {
      // TODO it appears to be too late to change the parser here, because
      // the response is already coming in. But it is supposed to be possible with fetch!
      //setParser(contentType);
      console.log('currentParserContentType after');
      console.log(currentParserContentType);
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
  console.log('end231-427-transduced');
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
