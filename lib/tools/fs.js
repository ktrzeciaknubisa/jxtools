// Copyright & License details are available under JXCORE_LICENSE file

var cp = require('child_process');
var common = require('../common.js');
var path = require('path');
var fs = require('fs');
var util = require('util');

// each command is { name : something", command : "uname -a" }
exports.execMultiple = function (commands, cb) {

  if (!util.isArray(commands))
    commands = commands[commands];

  var ret = {};

  var next = function () {
    var _cmd = commands.shift();

    if (!_cmd)
      return cb(ret);

    if (_cmd.caption)
      jxcore.utils.console.info(_cmd.caption);

    cp.exec(_cmd.command, function (error, stdout, stderr) {
      if (!error) {
        ret[_cmd.name] = stdout.toString().trim();
      } else {
        ret[_cmd.name] = {
          cmd: _cmd.command,
          err: error.toString().trim(),
          stdout: stdout,
          stderr: stderr,
          cwd: process.cwd()
        };
        ret.errors = true;
        if (!_cmd.skipError) {
          // exit on first error
          ret.errors = 'Command failed: `' + _cmd.command + '`:\n' + error;
          return cb(ret);
        }
      }
      process.nextTick(next);
    });
  };

  next();
};


exports.getRmdirCommand = function (fullDir) {
  var cmd = "rm -rf ";
  if (process.platform === 'win32') cmd = "rmdir /s /q ";
  if (process.platform === 'android') cmd = "rm -r "; // no -f allowed
  return cmd + fullDir;
};

exports.rmdirSync = function (fullDir) {

  if (common.onlyForJXcore('jxtools.fs.rmdirSync()'))
    return;

  fullDir = path.normalize(fullDir);
  if (!fs.existsSync(fullDir)) {
    return;
  }

  var cmd = exports.getRmdirCommand(fullDir);
  console.log("cmd", cmd);
  jxcore.utils.cmdSync(cmd);
};


/**
 * If src is a file, than copies it to dest.
 * If src is a folder, than copies it to dest recursively.
 * @param src
 * @param dest
 */
exports.copySync = function (src, dest) {

  src = path.normalize(src);
  dest = path.normalize(dest);
  if (!fs.existsSync(src)) {
    return;
  }

  var stats = fs.statSync(src);
  if (stats.isFile()) {
    fs.writeFileSync(dest, fs.readFileSync(src));
    return;
  }

  if (stats.isDirectory()) {
    var files = fs.readdirSync(src);

    if (!files.length) {
      return;
    }

    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }

    for (var a in files) {
      if (!files.hasOwnProperty(a))
        continue;
      var srcFile = src + path.sep + files[a];
      var dstFile = dest + path.sep + files[a];
      var stats = fs.statSync(srcFile);

      if (stats.isDirectory()) {
        exports.copySync(srcFile, dstFile);
      } else {
        fs.writeFileSync(dstFile, fs.readFileSync(srcFile));
      }
    }
  }
};