module.exports = function(self) {
  /* global importScripts */

  var _ = require('lodash');
  var assert = require('assert');
  // notice bitmask here is NOT the NPM bitmask package
  var Bitmask = require('bitmask');
  var ee = require('event-emitter');
  var hashTiny = require('../lib/hash-tiny.js');
  var orderedTags = require('./orderedTags.json');
  var inputTypeToParserBitmaskMappings = require('./inputTypeToParserBitmaskMappings.json');
  var requests = require('./transducing-http-client.js');

  assert(_.isEmpty(Bitmask.inspect(new Bitmask())));

  // NOTE: this is necessary because it makes Bitmask match
  // what it was when inputTypeToParserBitmaskMappings was created.
  orderedTags.forEach(function(tag) {
    new Bitmask(tag);
  });

  assert(!_.isEmpty(Bitmask.inspect(new Bitmask())));

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

  function getParserContentTypeFromInputType(inputType) {
    var hashed = hashTiny(inputType);
    var maskForHasInputType = new Bitmask(hashed);
    var matches = maskForHasInputType.filter(inputTypeToParserBitmaskMappings, 'any', 'tags');
    assert(matches.length <= 1);
    if (matches.length === 1) {
      return matches[0].parser;
    } else {
      return 'application/octet-stream';
    }
  }

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
  var setParser = function(inputType, parserSpec) {
    var options = parserSpec.options;
    var parserSrc = parserSpec.src;
    var parserName = parserSpec.name;
    if (!parserSrc) {
      var parserDir = parserSpec.dir;
      var parserContentType = getParserContentTypeFromInputType(inputType);
      parserName = convertContentTypeToParserName(parserContentType);
      var parserFilename = convertContentTypeToFilename(parserContentType);
      currentParserContentType = parserContentType;
      parserSrc = parserDir + parserFilename;
    }

    importScripts(parserSrc);
    currentParser = root[parserName](options);
  };

  self.addEventListener('message', function(event) {
    var args = event.data.args;
    var url = args[0];
    // NOTE that options and options.parser will always be at least an empty object,
    // having been filled in, if needed, with defaults in main.js
    var options = args[1];
    var parserSpec = options.parser;

    var headers = options.headers || {};
    var userProvidedAcceptHeader = headers['Accept'];

    var currentInputType = getParserContentType(
        parserSpec.type,
        userProvidedAcceptHeader,
        url
    );
    setParser(currentInputType, parserSpec);

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
    } else if (!!parserSpec) {
      options.headers['Accept'] = inputTypeToAcceptHeaderMappings[currentParserContentType];
    }

    requests(url, options)
    .on('before', function (socket) {
    })
    .on('send', function (socket) {
      if (!socket || !socket.hasOwnProperty('response')) {
        return;
      }

      var contentTypeAndEncoding = socket.response.headers.get('Content-Type');
      if (contentTypeAndEncoding) {
        var contentType = contentTypeAndEncoding.split(';')[0];
        var parserContentType = getParserContentTypeFromInputType(contentType);
        if (!parserSpec && !!contentType && (parserContentType !== currentParserContentType)) {
          // TODO it appears to be too late to change the parser here, because
          // the response is already coming in. But it is supposed to be possible with fetch!
          //setParser(contentType);

          // if there's no useful content type header, maybe use this:
          // https://www.npmjs.com/package/file-type
          // if that fails, try these:
          // https://www.npmjs.com/package/is-xml
          // https://www.npmjs.com/package/is-json
          // https://www.npmjs.com/package/validate-yaml
          //
          // maybe also consider these:
          // https://www.npmjs.com/package/is-html
          // https://www.npmjs.com/package/is-md
          // https://www.npmjs.com/package/is-svg
          //
          // or maybe just try each parser and use the first one that doesn't error?
        }
      }
    })
    .transduce(currentParser)
    .on('data', function(parsedChunk) {
      var dataString = JSON.stringify(parsedChunk);
      self.postMessage({
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
      self.postMessage({
        body: errJSON,
        type: 'error'
      });
      // TODO does this happen automatically?
      return close();
    })
    .on('end', function(x) {
      self.postMessage({
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
  });
}
