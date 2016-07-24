var sax = require('sax');
 
module.exports = function(options) {
  options = (typeof options === 'object') ? options : {};
  var strict = options.hasOwnProperty('strict') ? options.strict : true;

  var parser = sax.parser(strict);

  parser.onerror = function (err) {
    throw err;
  };

  var parsed = [];
  var eventNames = [
    'text',
    'doctype',
    'processinginstruction',
    'sgmldeclaration',
    'opentagstart',
    'opentag', // opened a tag.  node has "name" and "attributes" 
    'closetag',
    'attribute', // an attribute.  attr has "name" and "value"
    'comment',
    'opencdata',
    'cdata',
    'closecdata',
    'opennamespace',
    'closenamespace',
  ]
  .map(function(eventName) {
    parser['on' + eventName] = function(x) {
      parsed.push({
        type: eventName,
        value: x,
        line: parser.line,
        column: parser.column,
        position: parser.position,
        startTagPosition: parser.startTagPosition,
        tag: parser.tag,
      });
    };
  })

  parser.onend = function () {
    // parser stream is done, and ready to have more stuff written to it. 
    // TODO what should I do with this event? Is it safe to ignore it?
  };
   
  return function(rawChunk, previousChunkSuffix, isFinalChunk) {
    var runningRawChunk = [previousChunkSuffix, rawChunk].join('');
    if (!parser.closed) {
      parser.write(runningRawChunk);
    } else {
      parser.onready = function() {
        parser.write(runningRawChunk);
      };
    }

    if (isFinalChunk) {
      // TODO won't we miss data?
      parser.close();
      return [parsed];
    }

    var parsedChunk = parsed.splice(0, parsed.length - 1);
    return [parsedChunk];
  };
};
