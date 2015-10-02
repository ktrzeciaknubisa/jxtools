// Copyright & License details are available under JXCORE_LICENSE file


// each command is { name : something", command : "uname -a" }
exports.execMultiple = function (commands, cb) {

  if (!util.isArray(commands))
    commands = commands[commands];

  var ret = {};

  var next = function () {
    var _cmd = commands.shift();

    if (!_cmd)
      return cb(ret);

    cp.exec(_cmd.command, {timeout: 1000}, function (error, stdout, stderr) {
      if (!error) {
        ret[_cmd.name] = stdout.toString().trim();
      } else {
        ret[_cmd.name] = {err: error.toString().trim()};
        ret.errors = true;
      }
      process.nextTick(next);
    });
  };

  next();
};