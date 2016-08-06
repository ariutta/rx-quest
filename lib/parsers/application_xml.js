var _ = require('lodash');
var EventEmitter = require('eventemitter3');
var Rx = require('rx-extra');
var sax = require('sax');
var t = require('../transducers-extra.js');

module.exports = function(options) {
  function XMLTransduce(options, xf) {
    var that = this;
    options = (typeof options === 'object') ? options : {};
    var strict = options.hasOwnProperty('strict') ? options.strict : true;
    options.xmlns = options.hasOwnProperty('xmlns') ? options.xmlns : true;
    options.trim = options.hasOwnProperty('trim') ? options.trim : true;

    that.options = options;
    that.xf = xf;

    var saxStream = sax.createStream(strict, options);

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

    var currentLevel = 0;
    var openTagStart$ = getFromSaxStream(saxStream, 'opentagstart')
    .subscribe(function() {
      currentLevel += 1;
    }, function(err) {
      console.error(err.message);
      console.error(err.stack);
      throw err;
    })

    var closeTag$ = getFromSaxStream(saxStream, 'closetag')
    .subscribe(function() {
      currentLevel -= 1;
    }, function(err) {
      console.error(err.message);
      console.error(err.stack);
      throw err;
    })

    var tag$ = getFromSaxStream(saxStream, 'opentag')
    .concatMap(function(openTag) {
      var result = {};
      result.level = currentLevel;

      result.name = openTag.name;
      var attributes = _.reduce(_.values(openTag.attributes), function(acc, attribute) {
        acc[attribute.name] = attribute.value;
        return acc;
      }, {});

      if (!_.isEmpty(attributes)) {
        result.attributes = attributes;
      }

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
      )
      .takeUntil(withinElementBoundary$)
      .toArray()
      .reduce(function(acc, text) {
        return acc + text;
      }, '');

      var comment$ = getFromSaxStream(saxStream, 'comment')
      .takeUntil(openTagStart$)
      .toArray()
      .reduce(function(acc, comment) {
        return acc + comment;
      }, '');

      var nonElementChildren = Rx.Observable.forkJoin(
          textContent$,
          comment$
      )
      .flatMap(function(x) {
        return Rx.Observable.from(_.zip(['textContent', 'comment'], x));
      })
      .filter(function(pair) {
        return !_.isEmpty(pair[1]);
      });

      return nonElementChildren.defaultIfEmpty(null)
      .reduce(function(acc, zipped) {
        if (zipped) {
          var key = zipped[0];
          var value = zipped[1];
          acc[key] = value;
        }
        return acc;
      }, result);
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
