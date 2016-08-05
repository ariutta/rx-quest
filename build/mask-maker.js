var _ = require('lodash');
// notice this is NOT the NPM bitmask package
var Bitmask = require('bitmask');
var hashTiny = require('../lib/hash-tiny.js');
var fs = require('fs');
var path = require('path');

var typeMappings = [{
  // CSV
  extensions: [
    'csv',
  ],
  contentTypes: [
    'text/csv',
  ],
  parser: 'text/csv',
}, {
  // N-Triples
  // https://www.w3.org/TeamSubmission/n3/#mimetype
  extensions: [
    'n3',
  ],
  contentTypes: [
    'text/n3',
  ],
  parser: 'text/n3',
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
  parser: 'text/n3',
}, {
  // N-Quads
  // https://www.w3.org/TR/n-quads/
  extensions: [
    'nq',
  ],
  contentTypes: [
    'application/n-quads',
  ],
  parser: 'text/n3',
}, {
  // TriG
  // https://www.w3.org/TR/trig/
  extensions: [
    'trig',
  ],
  contentTypes: [
    'application/trig',
  ],
  parser: 'text/n3',
}, {
  // JSON
  extensions: [
    'json',
  ],
  contentTypes: [
    'application/json',
  ],
  parser: 'application/json',
}, {
  // New-line delimited JSON
  extensions: [
    'ndjson',
  ],
  contentTypes: [
    'application/x-ndjson',
    'application/ndjson',
  ],
  parser: 'application/x-ndjson',
}, {
  // TSV
  extensions: [
    'tsv',
  ],
  contentTypes: [
    'text/tab-separated-values',
  ],
  parser: 'text/tab-separated-values',
}, {
  // Binary or unknown
  extensions: [
  ],
  contentTypes: [
    'application/octet-stream',
  ],
  parser: 'application/octet-stream',
}, {
  // XML
  extensions: [
    'xml',
  ],
  contentTypes: [
    'application/xml',
    'text/xml',
  ],
  parser: 'application/xml',
}];

var inputTypesByParser = _.toPairs(
    typeMappings
    .reduce(function(acc, typeMapping) {
      var parser = typeMapping.parser;
      acc[parser] = acc[parser] || [];
      acc[parser] = _.union(acc[parser], typeMapping.contentTypes, typeMapping.extensions)
      .filter(function(inputType) {
        return inputType !== parser;
      })
      .concat([parser]);
      return acc;
    }, {})
)
.map(function(pair) {
  var parser = pair[0];
  var inputTypes = pair[1];
  return {
    parser: parser,
    inputTypes: inputTypes
  };
});

var orderedTags = inputTypesByParser.reduce(function(acc, item) {
  return acc.concat(_.reverse(item.inputTypes));
}, [])
.map(function(x) {
  return hashTiny(x);
});

var inputTypeToParserBitmaskMappings = inputTypesByParser
.map(function(x) {
  var parser = x.parser;
  var inputTypes = x.inputTypes;

  return {
    parser: parser,
    tags : new Bitmask(inputTypes).m
  };
});

//fs.writeFileSync(
//    './lib/inputTypeToParserBitmaskMappings.json',
//    JSON.stringify(inputTypeToParserBitmaskMappings),
//    {encoding: 'utf8'}
//);
//
//var bar = new Bitmask();
//console.log('created new bitmask in maker');
//console.log(bar);
//console.log('inspect');
//console.log(Bitmask.inspect(bar));
//console.log('get ndjson');
//console.log(Bitmask.get('ndjson'));
//
//console.log('inputTypeToParserBitmaskMappings');
//console.log(inputTypeToParserBitmaskMappings);
//console.log('inputTypeToParserBitmaskMappings.length');
//console.log(inputTypeToParserBitmaskMappings.length);
//var contentType = 'n3';
//var inputTypeToParserMask = new Bitmask(contentType);
//console.log('inputTypeToParserMask');
//console.log(inputTypeToParserMask);
//var parserContentTypes = inputTypeToParserMask.filter(
//    inputTypeToParserBitmaskMappings, 'any', 'tags');
//console.log('parserContentTypes137');
//console.log(parserContentTypes);

console.log('');
console.log('*** maker');

//var inputTypeToParserMappings = [
//    { parser: 'hot', tags: ['caliente', 'red'] },
//    { parser: 'cold', tags: ['json', 'frio'] },
//];

//var orderedTags = inputTypeToParserMappings.reduce(function(acc, item) {
//  var tags = _.clone(item.tags);
//  tags.push(item.parser);
//  return acc.concat(_.reverse(tags));
//}, [])
//.map(function(x) {
//  return hashTiny(x);
//});
console.log('orderedTags');
console.log(orderedTags);

//var inputTypeToParserBitmaskMappings = inputTypeToParserMappings.map(function(mapping) {
//  var parser = mapping.parser;
//  var tags = _.reverse(mapping.tags).concat([parser])
//  .map(function(x) {
//    return hashTiny(x);
//  });
//  console.log('tags');
//  console.log(tags);
//  return { parser: parser, tags: new Bitmask(tags).m };
//});
console.log('inputTypeToParserBitmaskMappings');
console.log(inputTypeToParserBitmaskMappings);

console.log('get hot');
console.log(hashTiny('hot'));
console.log(Bitmask.get(hashTiny('hot')));
console.log('get cold');
console.log(hashTiny('cold'));
console.log(Bitmask.get(hashTiny('cold')));
console.log('get json');
console.log(hashTiny('json'));
console.log(Bitmask.get(hashTiny('json')));

fs.writeFileSync(
    path.join(__dirname, 'orderedTags.json'),
    JSON.stringify(orderedTags),
    {encoding: 'utf8'}
);

fs.writeFileSync(
    path.join(__dirname, 'inputTypeToParserBitmaskMappings.json'),
    JSON.stringify(inputTypeToParserBitmaskMappings),
    {encoding: 'utf8'}
);

var jsonHashed = hashTiny('json');
console.log('jsonHashed');
console.log(jsonHashed);
var maskForHasJson = new Bitmask(jsonHashed);
// Notice the key name as the third param.
var hasJson = maskForHasJson.filter(inputTypeToParserBitmaskMappings, 'any', 'tags');
console.log('inspect');
console.log(Bitmask.inspect(maskForHasJson));
console.log('hasJson in maker');
console.log(hasJson);
