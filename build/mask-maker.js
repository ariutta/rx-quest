var _ = require('lodash');
// notice bitmask here is NOT the NPM bitmask package
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

if (_.uniq(orderedTags).length !== orderedTags.length) {
  throw new Error('Hash collision for inputTypes!');
}

var inputTypeToParserBitmaskMappings = inputTypesByParser
.map(function(x) {
  var parser = x.parser;
  var inputTypes = x.inputTypes;

  return {
    parser: parser,
    tags : new Bitmask(inputTypes).m
  };
});

fs.writeFileSync(
    path.join(__dirname, '..', 'lib', 'inputTypeToParserBitmaskMappings.json'),
    JSON.stringify(inputTypeToParserBitmaskMappings),
    {encoding: 'utf8'}
);

fs.writeFileSync(
    path.join(__dirname, '..', 'lib', 'orderedTags.json'),
    JSON.stringify(orderedTags),
    {encoding: 'utf8'}
);

//var spawn = require('child_process').spawn;
//var test = spawn('node', [path.join(__dirname, 'mask-maker-test.js')]);
//test.stdout.on('data', (data) => {
//  console.log(` ${data}`);
//});
//test.stderr.on('data', (data) => {
//  console.log(` ${data}`);
//});
//test.on('close', (code) => {
//  console.log(`child process exited with code ${code}`);
//});
