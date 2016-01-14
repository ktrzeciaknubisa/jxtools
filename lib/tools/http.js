// Copyright & License details are available under JXCORE_LICENSE file

var fs = require("fs");
var path = require("path");
var events = require('events');
var url = require('url');
var https = require('https');
var http = require('http');
var ProgressBar = require('progress');
var zip = require('./zip.js')
var consoleEx = require('./console.js');
var jx = require('./jx.js');

var isWindows = process.platform === 'win32';
var tpmFilePrefix = 'tmp_jxc_';

var timeouterId = 0;

var cleanup = function() {

  var files = fs.readdirSync(process.cwd());
  for(var o in files) {
    var f = files[o];
    if (files.hasOwnProperty(o) && f.slice(0,8) === tpmFilePrefix) {
      try {
        if (fs.existsSync(f)) {
          fs.unlinkSync(f);
          consoleEx.debugLog('process exit cleanupFiles', f);
        }
      } catch (ex) {
      }
    }
  }
};

process.on('exit', cleanup);


var onSignal = function(signal) {
  cleanup();
  process.exit(signal);
};

process.on('SIGTERM', function() { onSignal('SIGTERM'); });
process.on('SIGBREAK', function() { onSignal('SIGBREAK'); });
process.on('SIGINT', function() { onSignal('SIGINT'); });
process.on('SIGHUP', function() { onSignal('SIGHUP'); });


var timeouter = function(ms) {

  var _this = this;

  this.id = timeouterId++;
  var eventEmitter = new events.EventEmitter();
  this.on = function (event, listener) {
    eventEmitter.on(event, listener);
  };

  var start = Date.now();
  var stopped = false;

  this.ellapsed = null;

  this.start = function() {
    consoleEx.debugLog('timeouter', _this.id, 'started');
    _this.reset();
    setTimeout(_checkTimeout, 1);
  };

  this.reset = function() {
    start = Date.now();
    stopped = false;
  };

  this.stop = function() {
    consoleEx.debugLog('timeouter', _this.id, 'stopped');
    stopped = true;
  };

  var _checkTimeout = function() {
    if (stopped) return;

    _this.ellapsed = Date.now() - start;

    if (_this.ellapsed >= ms) {
      eventEmitter.emit('timeout');
    } else {
      setTimeout(_checkTimeout, 1000);
    }
  };
};


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
  var tm = null;
  var req = null;
  var file = null;
  var __error = null;
  var totalLength = 0;
  var fileAsString = '';
  var tmpFile = tpmFilePrefix + Date.now();
  var bar = null;

  if (localFile) {
    var dir = path.dirname(localFile);

    try {
      if (dir && !fs.existsSync(dir))
        fs.mkdirSync(dir);
    } catch (ex) {
      return _exit("Cannot create local dir: " + dir + ". " + ex);
    }
  }

  var _exit = function (err, tryNext, result) {

    if (tm) {
      tm.stop();
      tm = null;
    }

    __error = err;
    consoleEx.debugLog('downloader _exit called', err ? 'with err ' + err : 'without error');

    try {
      if (req)
      req.abort();
    } catch (ex) {}
    req = null;

    if (err) {

      try {
        if (file)
          file.end()
      } catch (ex) {}

      if (attemptId < attempts && tryNext) {
        attemptId++;
        consoleEx.debugLog('downloader _exit: going to next attempt in 2 seconds');
        setTimeout(_download, 2000);
        return;
      }
    }

    process.nextTick(function() {

      if (!err) {
  if (localFile) {
          fs.renameSync(tmpFile, localFile);
          if (!fs.existsSync(localFile))
            err = 'Could not move ' + tmpFile + ' to ' + localFile;
    }
    }

      cleanup();
      consoleEx.debugLog('downloader _exit: emitting end');
      eventEmitter.emit('end', err, result);
    });
  };

  var _options = url.parse(uri);
  var mod = null;

  if (_options.protocol === 'https:') {
    mod = https;
    _options.rejectUnauthorized = false;
  } else {
    mod = http;
  }

  if (!silent && attemptId == 1)
      consoleEx.logPair("Downloading", uri + "\n", "green");
  else
    consoleEx.debugLog('downloader starting download of', uri);

  var _download = function () {

    if (!silent && attempts !== 1) {
      if (bar && bar.ticked)
        consoleEx.clearLine();
      else
        consoleEx.clearLineAbove();

      console.log("Attempt", attemptId, "/", attempts);
    }

    __error = null;
    file = null;

    if (localFile) {
      try {
        file = fs.createWriteStream(tmpFile);
      } catch (ex) {
        return _exit("Cannot create local file: " + tmpFile.replace(process.cwd(), "."));
      }

      file.on('finish', function () {
        if (__error) return;
        consoleEx.debugLog('downloader response end: closing file', tmpFile);
        file.close();

        var stat = fs.statSync(tmpFile);
        consoleEx.debugLog('downloader fetched file size of', tmpFile, '=', stat.size);
        if (totalLength !== stat.size)
          return _exit('Downloaded only ' + stat.size + ' bytes instead of ' + totalLength, true);
        else
          return _exit();
      });
    }

    if (options.timeout) {
      tm = new timeouter(options.timeout);
      tm.on('timeout', function() {
        if (!__error) {
          consoleEx.debugLog('downloader forcing timeout after', tm.ellapsed);
          return _exit('Timeout occured (' + tm.ellapsed + ')', true);
        }
      });
      tm.start();
    }

    req = mod.get(_options, function (res) {

      fileAsString = "";

      if (res.statusCode !== 200)
        return _exit("Error status code: " + res.statusCode, true);

      //if (!res.headers || res.headers["content-type"] !== "application/zip")
      //  err = "Invalid content-type: " + res.headers["content-type"];

      if (__error)
        return _exit(__error, true);

      totalLength = parseInt(res.headers["content-length"] || 0, 10);
      bar = null;

      if (totalLength && !silent) {
        var title = 'Progress:';
        //if (attempts > 1)
        //  title = 'Attempt ' + attemptId + '/' + attempts + ':';
        bar = new ProgressBar(jxcore.utils.console.setColor(title, 'cyan') + ' [:bar] :percent  ' +
        jxcore.utils.console.setColor('Completes in:', 'cyan') + ' :etas', {
          complete: '=',
          incomplete: ' ',
          width: 40,
          total: totalLength
        });
      }

      res.on('data', function (chunk) {

        if (tm) tm.reset();

        if (bar) {
          if (!bar.ticked && !silent) {
            consoleEx.clearLineAbove();
            bar.ticked = true;
          }

          bar.tick(chunk.length);
        }

        if (!localFile)
          fileAsString += chunk;
        else
          file.write(chunk);
      });

      res.on('end', function () {
        if (__error) return;

        if (!silent)
          consoleEx.logPairAbove("Progress", 'Done');

        consoleEx.debugLog('downloader response end called', localFile);

        if (localFile) {
          // this will trigger file.on('finish')
          file.end();
        } else {
          return _exit(false, false, fileAsString);
        }
      });
    });

    req.on('error', function (e) {
      if (__error) return;
      consoleEx.debugLog('downloader error:', e);
      return _exit(e, true);
    });
  };

  setTimeout(_download, 1);
};


exports.download = function (url, localFile, options) {
  return new downloader(url, localFile, options);
};

/**
 * Downloads the latest JXcore available for current platform.
 * V8 by default
 * @param cb
 */
exports.downloadJXcore = function(version, engine, arch, cb) {

  var _cb = cb;
  if (typeof version === 'function') {
    _cb = version;
    version = engine = arch = null;
  }
  if (typeof engine === 'function') {
    _cb = engine;
    engine = arch = null;
  }
  if (typeof arch === 'function') {
    _cb = arch;
    arch = null;
  }

  var _go = function(ret) {
    var zipFile = path.join(process.cwd(), 'jx' + Date.now() + '.zip');

    var d = new downloader(ret.url, zipFile);
    d.on('end', function(err1, result) {

      if (err1)
        return _cb('Cannot download JXcore. Required version `' + ret.versionNormalized + '` might not be supported for that platform: ' + ret.basename);

      var unzipper = new zip.Unzipper();
      var fname = isWindows ? 'jx.exe' : 'jx';
      var jxFile = path.join(process.cwd(), fname);

      unzipper.on('end', function (err2) {

        try {
          fs.unlinkSync(zipFile);
        } catch (ex) {}

        if (err2)
          _cb(err2);
        else {

          if (process.platform !== "win32") {
            try {
              fs.chmodSync(jxFile, 0755);
            } catch (ex) {
            }
          }

          _cb(null, jxFile, ret);
        }
      });

      // even on windows it needs / (not \)
      unzipper.unzipFile(zipFile, ret.basename + '/' + fname, process.cwd());
    });
  };

  if (!version || version === 'latest') {
    exports.getLatestInfo(function(err, ret) {
      if (err)
        return _cb(err);

      _go(ret)
    });
  } else {
    var ret = exports.getDownloadPackageInfo(version, engine, arch);
    _go(ret);
  }
};

/**
 * Downloads the latest JXcore available for current platform.
 * V8 by default
 * @param cb
 */
exports.downloadLatestJXcore = function(cb) {
   exports.downloadJXcore('latest', null, null, cb);
};


/**
 * Returns { err, result }
 * @param url
 * @param options
 * @param cb
 */
exports.downloadString = function (url, options, cb) {
  var d = new downloader(url, null, options);
  d.on('end', function(err, result) {
    cb(err, result);
  });
};


/**
 * Returns info about latest JXcore available for download.
 * See ret object.
 * @param cb { err, ret }
 */
exports.getLatestInfo = function (cb) {

  var _url = "https://jxcore.s3.amazonaws.com/latest.txt";
  exports.downloadString(_url, { silent : true }, function(err, str) {
    var ret = null;
    if (err) {
      jxcore.utils.console.error("Cannot fetch JXcore latest release info:", _url);
      jxcore.utils.console.log(err);
    } else {
      // expected body e.g.: https://jxcore.s3.amazonaws.com/0304|Beta-0.3.0.4
      var arr = str.split("|");
      if (arr.length !== 2)
        err = "Invalid data: " + str;

      if (!err) {
        var ret = exports.getDownloadPackageInfo(arr[1]);
        // add extra info
        ret.urlPart = arr[0];  // e.g. https://jxcore.s3.amazonaws.com/0304;
        ret.version = arr[1];  // Beta-0.3.0.4
      }
    }

    cb(err, ret);
  });
};

/**
 * Returns info about download package url
 * {
 *  versionNormalized (e.g. 0237)
 *  engine (sm/v8)
 *  arch (32/64/MIPS/ARM)
 *  basename (e.g. jx_osx64v8)
 *  url (e.g.  https://jxcore.s3.amazonaws.com/0304/jx_osx64v8.zip)
 * }
 * @param version
 * @param engine
 * @param arch
 * @param platform
 */
exports.getDownloadPackageInfo = function(version, engine, arch, platform) {

  engine = engine || 'v8';
  var na = jx.normalizeArchitecture(arch);
  var nv = jx.normalizeJXcoreVersion(version);
  if (nv === "0237")
    engine = 'v8';

  var ret = {
    versionNormalized : nv,
    engine : engine,
    arch : na
  };

  var os_str = jxcore.utils.OSInfo().OS_STR.toLowerCase();
  if (arch)
    os_str = os_str.replace(/ARM|MIPS|64|32/gi, '') + na;

  if (nv === "0237") {
    ret.basename = 'jx_' + os_str;
    ret.url = "https://s3.amazonaws.com/nodejx/" + ret.basename + ".zip";
  } else {
    ret.basename = 'jx_' + os_str + engine;
    ret.url = "https://jxcore.s3.amazonaws.com/" + nv + "/" + ret.basename + ".zip";
  }

  return ret;
};