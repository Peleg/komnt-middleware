
var fs = require('fs');

var staticFiles = { tags: [] };

var staticDir = __dirname + '/static';

module.exports = function (app) {

  fs.readdir(staticDir, function (err, files) {
    if (err) throw err;
    files.forEach(function (file) {
      fs.stat(staticDir + '/' + file, function (err, stat) {
        if (err) throw err;

        if (/\.js$/i.test(file))
          staticFiles.tags.push('<script src="/komnt/' + file + '"></script>');
        else if (/\.css$/i.test(file))
          staticFiles.tags.unshift('<link rel="stylesheet" href="/komnt/' + file +'" />');

        // Open a route to the static file
        app.get('/komnt/' + file, function (req, res) {
          res.sendFile(staticDir + '/' + file);
        });

      });
    });
  });

  return function (req, res, next) {
    var write = res.write;
    res.write = function (chunk) {
      // only if html response and if buffer is complete
      if (!res.headersSent && ~chunk.toString().indexOf('</html>')) {
        chunk instanceof Buffer && (chunk = chunk.toString());
        chunk = chunk
          .replace(/(<\/head>)/, staticFiles.tags.join("\n") + "\n\n$1")
          .replace(/(<\/body>)/, "<script>(new Komnt()).enable();</script>\n\n$1");
        res.setHeader('Content-Length', chunk.length);
      }
      write.apply(this, arguments);
    };
    next();
  };
}
