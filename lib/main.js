var _ = require('lodash');
var defaultsDeep = _.defaultsDeep;
var isEmpty = _.isEmpty;
// TODO the requires below were causing errors.
// look at how to require only what's needed.
//var defaultsDeep = require('lodash/defaultsDeep');
//var isEmpty = require('lodash/isEmpty');
var conglomerateWorker = require('@conglomerate/worker');
var currentExecutingScript = require('current-executing-script');
var EventEmitter = require('eventemitter3');
var resolveUrl = require('resolve-url');

var scriptEl = currentExecutingScript();
var currentScriptPath;
if (scriptEl) {
  currentScriptPath = scriptEl.getAttribute('src');
}

function requests() {
  var args = Array.prototype.slice.call(arguments);
  var emitter = new EventEmitter();

  conglomerateWorker(require('./worker.js'))
  .then(function(worker) {
    worker.addEventListener('message', function(event) {
      var data = event.data;
      var type = data.type;
      var body = data.body;
      if (type === 'data') {
        emitter.emit('data', body);
      } else if (type === 'end') {
        emitter.emit('end', body);
      }
    });

    worker.onerror = function(err) {
      emitter.emit('error', err);
    };

    var defaultOptions = {
      parser: {}
    };

    var options = args[1];
    defaultsDeep(options, defaultOptions);

    if (!!options.parser.src) {
      if (!options.parser.name) {
        var message = [
          'if you specify options.parser.src, ',
          'you must also specify options.parser.name'
        ].join('');
        throw new Error(message);
      }
      options.parser.src = resolveUrl(options.parser.src);
    } else {
      var parserDir;
      if (currentScriptPath) {
        var currentScriptPathComponents = currentScriptPath.split('/');
        currentScriptPathComponents.pop();
        parserDir = currentScriptPathComponents.join('/');
      }
      if (isEmpty(parserDir)) {
        parserDir = './';
      }
      options.parser.dir = resolveUrl(options.parser.dir || parserDir);
    }

    worker.postMessage({
      args: args
    });
  });

  return emitter;
};

module.exports = requests;
