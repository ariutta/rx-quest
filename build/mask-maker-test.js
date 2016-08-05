// notice this is NOT the NPM bitmask package
var Bitmask = require('bitmask');
var fs = require('fs');
var hashTiny = require('../lib/hash-tiny.js');
var inputTypeToParserBitmaskMappings = require('./inputTypeToParserBitmaskMappings.json');
var orderedTags = require('./orderedTags.json');

//var parserContentTypes = inputTypeToParserBitmaskMappings.map(function(mapping) {
//  return mapping.parser;
//});
//
////var myB = new Bitmask(tags);
//
////inputTypeToParserBitmaskMappings.forEach(function(mapping) {
////  new Bitmask(mapping.parser);
////});
//
//var mask = new Bitmask(parserContentTypes)
////mask.set(tags);
//console.log('created new bitmask in test');
//console.log('mask');
//console.log(mask);
//console.log('inspect');
//console.log(Bitmask.inspect(mask));
//console.log('get ndjson');
//console.log(Bitmask.get('ndjson'));
//
//console.log('inputTypeToParserBitmaskMappings');
//console.log(inputTypeToParserBitmaskMappings);
//
//var contentType = 'ndjson';
//var inputTypeToParserMask = new Bitmask(contentType);
//console.log('inputTypeToParserMask');
//console.log(inputTypeToParserMask);
//
//var parserContentTypes = inputTypeToParserMask.filter(
//    inputTypeToParserBitmaskMappings,
//    'any',
//    'tags'
//);
//console.log('parserContentTypes137');
//console.log(parserContentTypes);

// key `tags` in these objects contains the `m` value
//var inputTypeToParserBitmaskMappings = [
//    { parser : 'hot', tags : new Bitmask('hot', 'red').m },
//    { parser : 'cold', tags : new Bitmask('cold', 'json').m },
//    { parser : 'lukewarm', tags : new Bitmask('lukewarm', 'red', 'json').m }
//];


orderedTags.forEach(function(tag) {
  new Bitmask(tag);
});

console.log('');
console.log('*** test');

console.log('inputTypeToParserBitmaskMappings');
console.log(inputTypeToParserBitmaskMappings);

//inputTypeToParserBitmaskMappings.forEach(function(mapping) {
//  var targetValue = mapping.tags;
//  var mask = new Bitmask(mapping.parser);
//  var currentValue = mask.m;
//  do {
//    mask = new Bitmask('dummy' + String(currentValue * 2));
//    currentValue = mask.m;
//  } while (targetValue > currentValue * 2);
//});

//var hot = new Bitmask('hot');
//var hot = new Bitmask('hot', 'red', 'caliente');
//console.log('inspect hot1');
//console.log(Bitmask.inspect(hot));

//function iterateMask(name) {
//  var mask = new Bitmask(name);
//  return mask.m * 2;
//}
//
//inputTypeToParserBitmaskMappings.forEach(function(mapping) {
//  var targetValue = mapping.tags;
//  console.log('targetValue');
//  console.log(targetValue);
//  var nextValue = iterateMask(mapping.parser);
//  console.log('nextValue');
//  console.log(nextValue);
//  do {
//    var name = 'dummy' + String(nextValue);
//    nextValue = iterateMask(name);
//    console.log('nextValue');
//    console.log(nextValue);
//  } while (targetValue > nextValue);
//});

//var cold = new Bitmask('cold');
//var cold = new Bitmask('cold', 'json', 'frio');
//console.log('inspect hot2');
//console.log(Bitmask.inspect(hot));
//console.log('inspect cold');
//console.log(Bitmask.inspect(cold));

//new Bitmask('hot');
//new Bitmask('cold');

console.log('get hot');
console.log(hashTiny('hot'));
console.log(Bitmask.get(hashTiny('hot')));
console.log('get cold');
console.log(hashTiny('cold'));
console.log(Bitmask.get(hashTiny('cold')));
console.log('get json');
console.log(hashTiny('json'));
console.log(Bitmask.get(hashTiny('json')));

var jsonHashed = hashTiny('json');
console.log('jsonHashed');
console.log(jsonHashed);
var maskForHasJson = new Bitmask(jsonHashed);
console.log('inspect');
console.log(Bitmask.inspect(maskForHasJson));
// Notice the key name as the third param.
var hasJson = maskForHasJson.filter(inputTypeToParserBitmaskMappings, 'any', 'tags');
console.log('hasJson in test');
console.log(hasJson);
