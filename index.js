// Copyright & License details are available under JXCORE_LICENSE file

var fs = require('fs');
var path = require('path');
var common = require('./lib/common.js');


for (var o in common) {
  if (common.hasOwnProperty(o))
    exports[o] = common[o];
}

if (typeof jxcore === 'undefined')
  jxcore = {utils: require('./lib/jx/_jx_utils')};


exports.console = require('./lib/tools/console');
exports.fs = require('./lib/tools/fs');
exports.http = require('./lib/tools/http');
exports.zip = require('./lib/tools/zip');



