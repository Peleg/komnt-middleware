# komnt-middleware

Express JS middleware to Komnt

Komnt allows you to add comments and annotate your webpages.

For more information on Komnt, check out the Komnt
[extension](https://chrome.google.com/webstore/detail/komnt/ocopajchgbhmlkcfbppfiegapgjneppa)

## Usage

#### Install the module:

```Bash
$ npm install --save komnt-middleware
```

#### Include in your app:

```JavaScript
var komnt = require('komnt-middleware');
var app = require('express')();

app.use(komnt(app));
```

Now all HTML responses will have Komnt injected in them.
