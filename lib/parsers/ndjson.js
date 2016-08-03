var ndjson = require('ndjson')
 
module.exports = function(options) {
  options = (typeof options === 'object') ? options : {};
  return ndjson.parse(options);
};
  
