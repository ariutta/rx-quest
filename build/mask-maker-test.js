var _ = require('lodash');
var assert = require('assert');
// notice bitmask here is NOT the NPM bitmask package
var Bitmask = require('bitmask');
var fs = require('fs');
var hashTiny = require('../lib/hash-tiny.js');
var path = require('path');

var inputTypeToParserBitmaskMappingsPath = path.join(
    __dirname,
    '..',
    'lib',
    'inputTypeToParserBitmaskMappings.json'
);
var inputTypeToParserBitmaskMappings = require(inputTypeToParserBitmaskMappingsPath);
var orderedTagsPath = path.join(__dirname, '..', 'lib', 'orderedTags.json');
var orderedTags = require(orderedTagsPath);

//console.log('inputTypeToParserBitmaskMappings');
//console.log(inputTypeToParserBitmaskMappings);
//console.log('orderedTags');
//console.log(orderedTags);

var mask = new Bitmask();
assert(_.isEmpty(Bitmask.inspect(mask)));

orderedTags.forEach(function(tag) {
  new Bitmask(tag);
});

assert(!_.isEmpty(Bitmask.inspect(mask)));

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

assert(getParserContentTypeFromInputType('json') === 'application/json');
assert(getParserContentTypeFromInputType('application/json') === 'application/json');

// TODO use better getParserContentTypeFromInputType to handle application/ld+json
//console.log(getParserContentTypeFromInputType('application/ld+json'));
//assert(getParserContentTypeFromInputType('application/ld+json') === 'application/json');

assert(getParserContentTypeFromInputType('text/csv') === 'text/csv');
assert(getParserContentTypeFromInputType('csv') === 'text/csv');

assert(getParserContentTypeFromInputType('application/xml') === 'application/xml');
assert(getParserContentTypeFromInputType('xml') === 'application/xml');

fs.unlinkSync(inputTypeToParserBitmaskMappingsPath);
fs.unlinkSync(orderedTagsPath);
