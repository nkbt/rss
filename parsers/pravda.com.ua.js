"use strict";

var _ = require('underscore');

exports.name = 'pravda.com.ua';
exports.url = 'http://pravda.com.ua/rss';
exports.encoding = 'win1251';
exports.parse = function (item) {
  return item['rss:fulltext'] && item['rss:fulltext']['#'] || '';
};
