// wrapper opening will be automatically inserted here

var _ = require('lodash');

var requests = require('requests');

function Transform(push) {
  this.push = push;
}

Transform.prototype['@@transducer/init'] = function () {
  return this.push;
};

Transform.prototype['@@transducer/result'] = function(push) {
  // Don't push nil here. Otherwise, we can't catch errors from `result`
  // and propagate them. The `transduce` implementation will do it.
  return push;
};

Transform.prototype['@@transducer/step'] = function(push, input) {
  push(null, input);
  return push;
};

requests.prototype.transduce = function transduce(xf) {
  var that = this;

  var transform = null;
  var memo = null;

  function push(err, x) {
    if (err) {
      console.log('err135');
      console.error(err.message);
      console.error(err.stack);
    }
    if (x !== 'nil') {
      that.emit('transduced', x);
    }
  }

  that.on('data', function(x) {
    if (transform === null) {
      transform = xf(new Transform(push));
      memo = transform['@@transducer/init']();
    }

    var res = runStep(push, memo, x);

    if (!res) {
      return;
    }

    memo = res;
    if (memo['@@transducer/reduced']) {
      runResult(memo['@@transducer/value']);
    }
  })
  .on('end', function(err) {
    if (err) {
      console.error(err.message);
      console.error(err.stack);
      // TODO how to handle errors?
      //throw err;
      that.emit('error', err);
    }
    runResult(push, memo);
  });

  function runResult(push, _memo) {
    try {
      transform['@@transducer/result'](_memo);
    } catch (e) {
      push(e);
    }
    push(null, 'nil');
  }

  function runStep(push, _memo, x) {
    try {
      return transform['@@transducer/step'](_memo, x);
    } catch (e) {
      push(e);
      push(null, 'nil');
      return null;
    }
  }

  return that;
};

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
  // JSON
  extensions: [
    'json',
  ],
  contentTypes: [
    'application/json',
  ],
  parser: 'json',
}, {
  // New-line delimited JSON
  extensions: [
    'ndjson',
  ],
  contentTypes: [
    'application/x-ndjson',
    'application/ndjson',
  ],
  parser: 'ndjson',
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

var currentParser;
var currentContentType;
var usingNoopParser;
// NOTE: two worker-wide side effects
function setParser(contentType, options) {
  var extension = inputTypeToParserMappings[contentType];
  if (!extension) {
    // To be used if no applicable parser is available
    extension = 'noop';
    usingNoopParser = true;
  } else {
    currentContentType = contentType;
    usingNoopParser = false;
  }
  importScripts(extension + '.js');
  currentParser = root[extension + 'parser'](options);
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

var myR = requests(url, options)
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
.on('data', function (chunk) {
  currentParser.write(chunk);
})
.on('end', function(err) {
  if (err) {
    console.error(err.message);
    console.error(err.stack);
    throw err;
    // TODO how to handle errors?
    //currentParser.emit('error', err);
  }
  currentParser.close();
});

currentParser
.on('data', function(parsedChunk) {
  var dataString = JSON.stringify(parsedChunk);
  postMessage({
    body: parsedChunk,
    type: 'data'
  });
})
.on('error', function(err) {
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
  postMessage({
    // TODO will x ever be anything?
    result: x,
    type: 'end'
  });
});

// transducers experiment

var t = require('transducers-js');

var map    = t.map,
    filter = t.filter,
    comp   = t.comp,
    into   = t.into;

function exists(x) {
  return !!x;
}

var TRANSDUCERS_DEV = true;

//// this is a transformer. it appears to be
//// a way to take any function and express
//// it in terms of reduce.
/**
 * @constructor
 */
function Split(pred, xf) {
  var that = this;
  that.pred = pred;
  that.remainder = '';
  that.xf = xf;
};
Split.prototype['@@transducer/init'] = function() {
  return this.xf['@@transducer/init']();
};
Split.prototype['@@transducer/result'] = function(result) {
    return this.xf['@@transducer/result'](result);
};
Split.prototype['@@transducer/step'] = function(result, input) {
  var that = this;
  var pred = that.pred;

  var previousRemainder = that.remainder;
  var runningInput = previousRemainder + input;
  var lines = runningInput.split(pred);
  that.remainder = lines.pop();
  if (lines.length > 0) {
    var xf = that.xf;
    return lines.reduce(function(acc, line) {
      // TODO I would like to define stepFn once outside this reduction,
      // but it appears we need to bind a context somehow
      // to make stepFn work, but nothing I tried worked.
      // I can't even get stepFn to work when I define it inside this reduction.
      //var stepFn = xf['@@transducer/step'];
      //return stepFn(acc, line); 

      // But this does work.
      return xf['@@transducer/step'](acc, line); 
    }, result);
  } else {
    return result;
  }
};

/**
 * Splitting transducer constructor
 * @method split
 * @param {Function} pred a predicate string
 * @return {Object} returns a spliting transducer
 */
function split(pred) {
  var that = this;
  if(TRANSDUCERS_DEV && (typeof pred !== 'string')) {
    throw new Error('split must be given a string');
  } else {
    return function(xf) {
      return new Split(pred, xf);
    };
  }
};

var N3 = require('n3');
 
function n3Parse(chunk, options) {
  console.log('chunk');
  console.log(chunk);
  options = (typeof options === 'object') ? options : {};

  var parser = N3.Parser();
  var triples = [];
  parser.parse(function(error, triple, prefixes) {
    triple && triples.push(triple);
  });
  parser.addChunk(chunk + '\n');
  console.log('triples');
  console.log(triples);
  //return triples.splice(0, triples.length - 1);
  return triples[0];
}

function N3Transduce(options, xf) {
  var that = this;
  options = (typeof options === 'object') ? options : {};
  that.options = options;
  that.xf = xf;

  var parser = N3.Parser(options);
  var triples = [];
  parser.parse(function(error, triple, prefixes) {
    triple && triples.push(triple);
  });
  that.parser = parser;
  that.triples = triples;
};
N3Transduce.prototype['@@transducer/init'] = function() {
  return this.xf['@@transducer/init']();
};
N3Transduce.prototype['@@transducer/result'] = function(result) {
  return this.xf['@@transducer/result'](result);
};
N3Transduce.prototype['@@transducer/step'] = function(result, input) {
  var that = this;
  var parser = that.parser;
  var triples = that.triples;

  parser.addChunk(input);
  var x = triples.splice(0, triples.length - 1);

  if (x.length > 0) {
    var xf = that.xf;
    return x.reduce(function(acc, line) {
      return xf['@@transducer/step'](acc, line); 
    }, result);
  } else {
    return result;
  }
};

/**
 * transducer constructor for N3Transduce 
 * @method split
 * @param {Object} options
 * @return {Object} returns a transducer
 */
function n3Transduce(options) {
  var that = this;
  return function(xf) {
    return new N3Transduce(options, xf);
  };
};

//var xf = comp(split('\n'), map(n3Parse), filter(exists));
var xf = comp(n3Transduce(), filter(exists));
myR.transduce(xf)
.on('transduced', function(transduced) {
  console.log('transduced');
  console.log(transduced);
});

// wrapper closing will be automatically inserted here
