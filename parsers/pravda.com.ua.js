"use strict";

var _ = require('underscore');
var request = require('request');


exports.url = 'http://pravda.com.ua/rss';
exports.encoding = 'win1251';
exports.parse = function (item, page) {

	return item['rss:fulltext'] && item['rss:fulltext']['#'] || '';
};
