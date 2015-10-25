// Copyright & License details are available under JXCORE_LICENSE file

var path = require('path');
var fs = require('fs');

exports.isJXcore = typeof process.versions.jxcore !== 'undefined';
exports.homeDir = process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH;

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

var returnError = function (err, verbose) {
  if (verbose)
    jxcore.utils.console.error(err);
  return {err: err};
};

exports.checkHomeDir = function (app, verbose) {

  if (!app)
    return returnError('Method checkHomeDir() expects an app name to be given.', verbose);

  if (typeof app !== 'string')
    return returnError('Method checkHomeDir() expects an app name to be a string.', verbose);

  if (app.slice(0, 1) !== '.')
    app = '.' + app;

  var homeDir = path.join(exports.homeDir, app);

  if (!fs.existsSync(homeDir)) {
    try {
      fs.mkdirSync(homeDir);
    } catch (ex) {
      return returnError('Cannot create ' + homeDir + ':\n' + ex, verbose);
    }
  }

  return true;
};
