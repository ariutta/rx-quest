var Base58 = require('base58');

function crc8(input) {
  var acc = 0;
  var polynomial = 0x07;
  for (var i = 0; i < input.length; i++) {
    var charCode = input.charCodeAt(i);
    acc ^= charCode;
    for(var j = 0; j < 8; j++) {
      if(acc & 0x80 ) {
        acc = (acc << 1) ^ polynomial;
      } else {
        acc <<= 1;
      }
    }
    acc &= 0xff;
  }
  return acc;
}

module.exports = function(input) {
  return Base58.encode(crc8(input));
};
