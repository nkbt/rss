"use strict";

var FeedParser = require('feedparser');
var request = require('request');
var fs = require('fs');
var iconv = require('iconv-lite');
var glob = require('glob');
var _ = require('underscore');
var Readable = require('stream').Readable;
var cheerio = require('cheerio');
var async = require('async');

var feeds = _.map(glob.sync('./parsers/*.js'), require);


function fetchPage(feed, itemRaw, callback) {


	request.get(itemRaw.link, {encoding: 'binary'}, function (error, res, body) {
		if (error) {
			return callback(error);
		}
		if (res.statusCode !== 200) {
			return callback(new Error('Bad status code'));
		}
		console.log("body", body);
	});
}

function processItem(feed, item, callback) {
//	content = feed.parse(itemRaw);
//	item = _.extend(_.pick(itemRaw, 'title', 'date', 'link'), {
//		image: itemRaw.enclosures.length && itemRaw.enclosures.shift().url || itemRaw.meta.image.url,
//		content: _.isString(content) && content || itemRaw.summary
//	});

	return callback(null, item);
}

function processItems(feed, items, callback) {
	return async.map(items, async.apply(processItem, feed), callback);
}


function updateFeed(feed) {
	return request.get(feed.url, {encoding: 'binary'}, function (error, res, body) {
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
				itemRaw = stream.read(),
				item,
				content,
				itemsRaw = [];

			while (itemRaw) {
				itemsRaw.push(itemRaw);
				itemRaw = stream.read();
			}

			return processItems(feed, itemsRaw, function(error, items) {
				if (error) {
					return console.error(error);
				}
				return console.log(items);
			});
		});

		rs.push(new Buffer(iconv.fromEncoding(body, feed.encoding), 'UTF-8'));
		rs.push(null);
		rs.pipe(feedparser);
	});
}


_.each(feeds, updateFeed);
