var _ = require('lodash');
var EventEmitter = require('eventemitter3');
var Rx = require('rx-extra');
var sax = require('sax');
var t = require('../transducers-extra.js');

// uses code from and tries to match
// https://github.com/Leonidas-from-XIV/node-xml2js

/**
 * convert XML to JSON, streaming.
 *
 * @param options same as xml2js options (not currently handling all of these)
 * @returns {Object} result XML element in the format used by
 *                   https://www.npmjs.com/package/xml2js,
 *                   except for added '@level' property
 * @returns {Number} result['@level'] tree level of this element in XML document
 */
module.exports = function(options) {
  function XMLTransduce(options, xf) {
    var that = this;
    options = (typeof options === 'object') ? options : {};

    // TODO not currently handling all of these
    var defaults = {
      explicitCharkey: false,
      trim: false,
      normalize: false,
      normalizeTags: false,
      attrkey: '$',
      charkey: '_',
      explicitArray: true,
      ignoreAttrs: false,
      mergeAttrs: false,
      explicitRoot: true,
      validator: null,
      xmlns: false,
      explicitChildren: false,
      preserveChildrenOrder: false,
      childkey: '$$',
      charsAsChildren: false,
      includeWhiteChars: false,
      async: false,
      strict: true,
      attrNameProcessors: null,
      attrValueProcessors: null,
      tagNameProcessors: null,
      valueProcessors: null,
      rootName: 'root',
      xmldec: {
        'version': '1.0',
        'encoding': 'UTF-8',
        'standalone': true
      },
      doctype: null,
      renderOpts: {
        'pretty': true,
        'indent': '  ',
        'newline': '\n'
      },
      headless: false,
      chunkSize: 10000,
      emptyTag: '',
      cdata: false
    };

    _.defaults(options, defaults);

    that.options = options;
    that.xf = xf;

    if (options.xmlns) {
      options.xmlnskey = options.attrkey + 'ns';
    }

    var saxStream = sax.createStream(options.strict, {
      // TODO why does xml2js set this to false?
      //trim: false,
      trim: true,
      normalize: false,
      xmlns: options.xmlns
    });

    function getFromSaxStream(e, name) {
      return Rx.Observable.fromEventPattern(
        function add(h) {
          e.on(name, h);      
        },
        function remove(h) {
          // strange that this is "removeListener"
          // but for add, it's "on" but that
          // appears to be the only way to
          // make it work.
          e.removeListener(name, h);
        }
      );
    }

    function requiresCDATA(entry) {
      return entry.indexOf('&') >= 0 || entry.indexOf('>') >= 0 || entry.indexOf('<') >= 0;
    }

    function escapeCDATA(entry) {
      return entry.replace(']]>', ']]]]><![CDATA[>');
    }

    function wrapCDATA(entry) {
      return '<![CDATA[' + (escapeCDATA(entry)) + ']]>';
    }

    var currentLevel = 0;
    var openTagStart$ = getFromSaxStream(saxStream, 'opentagstart')
    .subscribe(function() {
      currentLevel += 1;
    }, function(err) {
      console.error(err.message);
      console.error(err.stack);
      throw err;
    });

    var closeTag$ = getFromSaxStream(saxStream, 'closetag')
    .subscribe(function() {
      currentLevel -= 1;
    }, function(err) {
      console.error(err.message);
      console.error(err.stack);
      throw err;
    })

    var tag$ = getFromSaxStream(saxStream, 'opentag')
    .concatMap(function(node) {
      var result = {};
      result['@level'] = currentLevel;

      var attributes = node.attributes;

      var openTagStart$ = getFromSaxStream(saxStream, 'opentagstart')
      .first()
      .share();

      var closeTag$ = getFromSaxStream(saxStream, 'closetag')
      .first()
      .share();

      var withinElementBoundary$ = Rx.Observable.merge(
          closeTag$,
          openTagStart$
      )
      .first()
      .share();

      var textContent$ = Rx.Observable.merge(
          getFromSaxStream(saxStream, 'text'),
          getFromSaxStream(saxStream, 'cdata')
          .map(function(entry) {
            if (requiresCDATA(entry)) {
              return wrapCDATA(entry);
            } else {
              return entry;
            }
          })
      )
      .takeUntil(withinElementBoundary$)
      .filter(function(entry) {
        return !_.isEmpty(entry);
      })
      .toArray()
      .reduce(function(acc, text) {
        return acc + text;
      }, '');

      var seedValue;
      if (!_.isEmpty(attributes) || options.explicitCharkey) {
        seedValue = {};
        if (options.xmlns) {
          seedValue[options.xmlnskey] = {
            uri: node.uri,
            local: node.local
          };
        }
        if (!_.isEmpty(attributes)) {
          seedValue[options.attrkey] = attributes;
        }
      } else {
        seedValue = [];
      }

      var resultValue$ = textContent$.defaultIfEmpty(null)
      .reduce(function(acc, textContent) {
        if (textContent) {
          if (_.isPlainObject(acc)) {
            acc[options.charkey] = textContent;
          } else {
            acc.push(textContent);
          }
        }
        return acc;
      }, seedValue);

      return resultValue$
      .map(function(resultValue) {
        result[node.name] = resultValue;
        return result;
      });
    });

    var parser = new EventEmitter();

    tag$
    .subscribe(function(x) {
      parser.emit('data', x);
    }, function(err) {
      console.error(err.message);
      console.error(err.stack);
      throw err;
    }, function() {
      parser.emit('end');
    });

    parser.write = function(chunk) {
      saxStream.write(chunk);
    };

    parser.close = function() {
      saxStream.end();
    };

    var parsedChunks = [];

    parser
    .on('data', function(parsedChunk) {
      parsedChunk && parsedChunks.push(parsedChunk);
    })
    .on('error', function(err) {
      console.error(err.message);
      console.error(err.stack);
    })
    .on('end', function(err) {
      // TODO how to handle errors?
      if (err) {
        console.error(err.message);
        console.error(err.stack);
        throw err;
      }
    });

    that.parser = parser;
    that.parsedChunks = parsedChunks;
  };
  XMLTransduce.prototype['@@transducer/init'] = function() {
    return this.xf['@@transducer/init']();
  };
  XMLTransduce.prototype['@@transducer/result'] = function(result) {
    return this.xf['@@transducer/result'](result);
  };
  XMLTransduce.prototype['@@transducer/step'] = function(result, input) {
    var that = this;
    var parser = that.parser;
    var parsedChunks = that.parsedChunks;

    parser.write(input);
    var x = parsedChunks.splice(0, parsedChunks.length);

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
   * transducer constructor for XMLTransduce 
   * @method split
   * @param {Object} options
   * @return {Object} returns a transducer
   */
  function xmlTransduce(options) {
    var that = this;
    return function(xf) {
      return new XMLTransduce(options, xf);
    };
  };

  function exists(x) {
    return !!x;
  }

  var xf = t.comp(xmlTransduce(), t.filter(exists));
  return xf;
};
