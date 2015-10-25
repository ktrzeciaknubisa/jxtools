// Copyright & License details are available under JXCORE_LICENSE file

var fs = require("fs");
var path = require("path");
var events = require('events');
var url = require('url');
var https = require('https');
var http = require('http');
var ProgressBar = require('progress');

var consoleEx = require('./console.js');


var downloader = function (uri, localFile, options) {

  if (!options)
    options = {};

  var eventEmitter = new events.EventEmitter();
  this.on = function (event, listener) {
    eventEmitter.on(event, listener);
  };
  var silent = options.silent || false;
  var attempts = options.attempts || 1;
  var attemptId = 1;
  var req = null;
  if (localFile)
    var dir = path.dirname(localFile);

  var _exit = function (err, tryNext, result) {
    if (req) {
      req.abort();
      req = null;
    }

    if (err) {
      //console.log('exit1');
      if (attemptId < attempts && tryNext) {
        //console.log('exit2');
        attemptId++;
        process.nextTick(_download);
        return;
      }

      if (!silent)
        jxcore.utils.console.error(err);
    }

    process.nextTick(function() {
      eventEmitter.emit('end', err, result);
    });
  };

  if (localFile) {
    try {
      if (!fs.existsSync(dir))
        fs.mkdirSync(dir);
    } catch (ex) {
      return _exit("Cannot create local dir: " + dir + ". " + ex);
    }

    try {
      var file = fs.createWriteStream(localFile);
    } catch (ex) {
      return _exit("Cannot create local file: " + localFile.replace(process.cwd(), "."));
    }
  }

  var _options = url.parse(uri);
  var mod = null;

  if (!_options.protocol === 'https:') {
    mod = https;
    _options.rejectUnauthorized = false;
  } else {
    mod = http;
  }

  if (!silent && attemptId == 1)
      consoleEx.logPair("Downloading", uri + "\n", "green");

  var _download = function () {

    if (!silent && attempts !== 1) {
      consoleEx.clearLineAbove();
      console.log("Attempt", attemptId, "/", attempts);
    }

    if (!localFile)
      var fileAsString = "";

    req = mod.get(_options, function (res) {

      var err = false;

      if (res.statusCode !== 200)
        err = "Error status code: " + res.statusCode;

      //if (!res.headers || res.headers["content-type"] !== "application/zip")
      //  err = "Invalid content-type: " + res.headers["content-type"];

      if (err)
        return _exit(err, true);

      var totalLength = parseInt(res.headers["content-length"] || 0, 10);

      var bar = null;
      if (totalLength && !silent) {
        var bar = new ProgressBar(jxcore.utils.console.setColor('Progress:', 'cyan') + ' [:bar] :percent  ' +
        jxcore.utils.console.setColor('Completes in:', 'cyan') + ' :etas', {
          complete: '=',
          incomplete: ' ',
          width: 40,
          total: totalLength
        });
      }

      if (localFile)
        res.pipe(file);

      res.on('data', function (chunk) {

        if (bar) {
          if (!bar.ticked && !silent) {
            consoleEx.clearLineAbove();
            bar.ticked = true;
          }

          bar.tick(chunk.length);
        }

        if (!localFile)
          fileAsString += chunk;

      }).on('end', function () {

        if (!silent) {
          consoleEx.logPairAbove("Progress", 'Done');
        }

        if (localFile) {
          file.on('finish', function () {
            file.close();
            return _exit();
          });

          file.end();
        } else {
          return _exit(false, false, fileAsString);
        }

      });
    }).on('error', function (e) {
      return _exit(e, true);
    });

    if (options.timeout) {
      req.setTimeout(options.timeout, function() {
        req.abort();
      });
    }
  };

  process.nextTick(_download);
};


exports.download = function (url, localFile, options) {
  return new downloader(url, localFile, options);
};


exports.downloadString = function (url, options, cb) {
  var d = new downloader(url, null, options);
  d.on('end', function(err, result) {
    cb(err, result);
  });
};


exports.getLatestInfo = function (cb) {

  var _url = "https://jxcore.s3.amazonaws.com/latest.txt";
  exports.downloadString(_url, { silent : true }, function(err, str) {
    if (err) {
      jxcore.utils.console.error("Cannot fetch JXcore latest release info:", _url);
      jxcore.utils.console.log(err);
    } else {
      // expected body e.g.: https://jxcore.s3.amazonaws.com/0304|Beta-0.3.0.4
      var arr = str.split("|");
      if (arr.length !== 2)
        err = "Invalid data: " + str;
    }

    cb(err, arr[1]);
  });
};