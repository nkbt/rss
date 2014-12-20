"use strict";

var FeedParser = require('feedparser');
var request = require('request');
var fs = require('fs');
var glob = require('glob');
var _ = require('underscore');
var mkdirp = require('mkdirp');
var Iconv = require('iconv').Iconv;

var feeds = _.map(glob.sync('./parsers/*.js'), require);

function createDir(name, date, callback) {
  var day = [
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ].join('-');
  var dir = ['cache', name, day].join('/');

  mkdirp(dir, function() {
    callback(null, dir);
  });
}

function fetch(feed) {
  var req = request(feed.url, {timeout: 10000, pool: false});
  req.setMaxListeners(50);
  req.setHeader('user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36');
  req.setHeader('accept', 'text/html,application/xhtml+xml');

  var feedparser = new FeedParser();

  // Define our handlers
  req.on('error', done);
  req.on('response', function (res) {
    if (res.statusCode !== 200) {
      return this.emit('error', new Error('Bad status code'));
    }
    var charset = feed.charset || getParams(res.headers['content-type'] || '').charset;
    res = maybeTranslate(res, charset);
    // And boom goes the dynamite
    res.pipe(feedparser);
  });

  feedparser.on('error', done);
  feedparser.on('end', done);
  feedparser.on('readable', function () {
    while (readPost(feed, this.read())) {

    }
  });
}


function readPost(feed, itemRaw) {
  if (!itemRaw) {
    return null;
  }

  var item;
  var content;

  content = feed.parse(itemRaw);
  item = _.extend(_.pick(itemRaw, 'title', 'date', 'link'), {
    image: itemRaw.enclosures.length && itemRaw.enclosures.shift().url || itemRaw.meta.image.url,
    content: _.isString(content) && content || itemRaw.summary
  });
  //itemRaw = stream.read();


  createDir(feed.name, item.date, function(err, dir) {
    fs.writeFile(
      [dir, item.date.getTime() + '.json'].join('/'),
      JSON.stringify(item, null, '\t'),
      'UTF-8',
      function() {
      }
    );
  });

  return itemRaw;
}

function maybeTranslate(res, charset) {
  var iconv;
  // Use iconv if its not utf8 already.
  if (!iconv && charset && !/utf-*8/i.test(charset)) {
    try {
      iconv = new Iconv(charset, 'utf-8');
      iconv.on('error', done);
      // If we're using iconv, stream will be the output of iconv
      // otherwise it will remain the output of request
      res = res.pipe(iconv);
    } catch (err) {
      res.emit('error', err);
    }
  }
  return res;
}

function getParams(str) {
  var params = str.split(';').reduce(function (params, param) {
    var parts = param.split('=').map(function (part) { return part.trim(); });
    if (parts.length === 2) {
      params[parts[0]] = parts[1];
    }
    return params;
  }, {});
  return params;
}

function done(err) {
  if (err) {
    console.log(err, err.stack);
    //return process.exit(1);
  }
  //server.close();
  //process.exit();
}

var server = require('http').createServer(function (req, res) {
  var stream = require('fs').createReadStream(require('path').resolve(__dirname, '../test/feeds' + req.url));
  res.setHeader('Content-Type', 'text/xml; charset=Windows-1251');
  stream.pipe(res);

});

_.each(feeds, function (feed) {
  server.listen(0, function () {
    fetch(feed);
  });
});
