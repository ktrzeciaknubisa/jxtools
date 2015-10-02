// Copyright & License details are available under JXCORE_LICENSE file

var DownloadProgress = require('download-progress');

exports.download = function (url, localFile, cb) {

  jxcore.utils.console.info("Downloading...");
  var urls = [{
    url: url,
    dest: localFile
  }];

  var download = DownloadProgress(urls, {});

  download.get(function (err) {
    if (!err)
      jxcore.utils.console.info("Saved:", localFile);
    cb(err)
  });
};