// Copyright & License details are available under JXCORE_LICENSE file

var console = jxcore.utils.console;

var writeDebug = jxcore.utils.argv.parse().debug;

exports.clearLineAbove = function () {
  var cursorUp = "\033[1A";
  var clearLine = "\033[K";
  console.write(cursorUp + clearLine);
};

exports.clearLine = function () {
  var cursorBeginningOfLine = "\033[255D";
  var clearLine = "\033[K";
  console.write(cursorBeginningOfLine + clearLine);
};

exports.logPair = function (first, second, color) {
  if (first.slice(-1) !== ':')
    first += ':';

  first = console.setColor(first, "cyan");
  if (second === "Done")
    color = "green";
  if (color)
    second = console.setColor(second, color);
  console.log(first, second);
};


exports.logPairAbove = function (first, second, color) {
  exports.clearLineAbove();
  exports.logPair(first, second, color);
};


exports.debugLog = function() {
  if (writeDebug)
    console.info.log(null, arguments);
};

exports.debugInfo = function() {
 if (writeDebug)
  console.info.apply(null, arguments);
};

exports.debugWarn = function() {
  if (writeDebug)
    console.warn.apply(null, arguments);
};

exports.debugError = function() {
  if (writeDebug)
    console.error.apply(null, arguments);
};