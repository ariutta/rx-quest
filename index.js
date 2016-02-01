var hyperquest = require('hyperquest');
var RxNode = require('rx-node-extra');

function rxQuestGet(uri, opts) {
  opts = opts || {};
  if (typeof uri === 'string') {
    opts.uri = uri;
  } else {
    opts = uri;
  }
  var stream = hyperquest(opts);
  return RxNode.fromUnpauseableStream(stream);
}

function rxQuest(uri, opts) {
  return rxQuestGet(uri, opts);
}

rxQuest.get = function rxQuest(uri, opts) {
  return rxQuestGet(uri, opts);
};

module.exports = rxQuest;
