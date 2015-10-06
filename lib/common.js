// Copyright & License details are available under JXCORE_LICENSE file

var path = require('path');

exports.isJXcore = typeof process.versions.jxcore !== 'undefined';

exports.onlyForJXcore = function (methodName) {

  if (!exports.isJXcore) {
    if (methodName) {
      jxcore.utils.console.write('\nThe following method is designed to work only with JXcore: ', 'red');
      jxcore.utils.console.error(methodName, '.', 'yellow');
    } else {
      jxcore.utils.console.error('\nThis command is designed to work only with JXcore.');
    }

    jxcore.utils.console.log('You may want to use `jx install` rather than `npm install` for installing', path.basename(process.argv[1]), '.');
    process.exit();
  }

};
