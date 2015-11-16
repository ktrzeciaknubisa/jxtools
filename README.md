# jxtools

JXcore Tools

```js
var jxtools = require('jxtools');
```

#### tools/zip.js

```js
var unzipper = new jxtools.zip.Unzipper();

unzipper.on('end', function (err) {
    if (err)
    console.error(err);
});

unzipper.unzip(file, input.localDir);
```



