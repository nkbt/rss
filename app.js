"use strict";

var FeedParser = require('feedparser');
var request = require('request');
var fs = require('fs');
var iconv = require('iconv-lite');
var glob = require('glob');
var _ = require('underscore');
var Readable = require('stream').Readable;

var feeds = _.map(glob.sync('./parsers/*.js'), require);


function updateFeed(feed) {
	return request.get(feed.url, {encoding: 'binary'}, function (error, res) {
		var rs = new Readable(),
			feedparser = new FeedParser();

		if (error) {
			return rs.emit('error', error);
		}
		if (res.statusCode !== 200) {
			return rs.emit('error', new Error('Bad status code'));
		}


		feedparser.on('error', function (error) {
			// always handle errors
		});
		feedparser.on('readable', function () {
			var stream = this,
//		meta = this.meta,
				itemRaw = stream.read(),
				item,
				content;

			while (itemRaw) {
				content = feed.parse(itemRaw);
				item = _.extend(_.pick(itemRaw, 'title', 'date', 'link'), {
					image: itemRaw.enclosures.length && itemRaw.enclosures.shift().url || itemRaw.meta.image.url,
					content: _.isString(content) && content || itemRaw.summary
				});
				itemRaw = stream.read();

				// TODO: Store in DB
				console.log(item);
			}
		});

		rs.push(new Buffer(iconv.fromEncoding(res.body, feed.encoding), 'UTF-8'));
		rs.push(null);
		rs.pipe(feedparser);
	});
}


_.each(feeds, updateFeed);
