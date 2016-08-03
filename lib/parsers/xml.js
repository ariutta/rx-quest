var _ = require('lodash');
var EventEmitter = require('eventemitter3');
var Rx = require('rx-extra');
var sax = require('sax');

module.exports = function(options) {
  options = (typeof options === 'object') ? options : {};
  var strict = options.hasOwnProperty('strict') ? options.strict : true;
  options.xmlns = options.hasOwnProperty('xmlns') ? options.xmlns : true;
  options.trim = options.hasOwnProperty('trim') ? options.trim : true;

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

  var emitter = new EventEmitter();

  tag$
  .subscribe(function(x) {
    emitter.emit('data', x);
  }, function(err) {
    console.error(err.message);
    console.error(err.stack);
    throw err;
  }, function() {
    emitter.emit('end');
  });

  emitter.write = function(chunk) {
    saxStream.write(chunk);
  };

  emitter.close = function() {
    saxStream.end();
  };

  return emitter;
};
