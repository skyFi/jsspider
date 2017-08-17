'use strict';

const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
const log = require('rainbowlog');
const config = require('../common/config');

function writeIntoFile(data) {
  fs.writeFile('output.txt', data, (err) => {
    if (err) {
      return err.stack;
    }
    log.debug('File write done!');
  });
}

function BlogSpider(url, callback) {
  // 使用request模块进行爬虫
  request(url, (err, res) => {
    if (err) {
      return err.stack;
    }
    const $ = cheerio.load(res.body.toString());

    const articleList = [];
    $('.articleList .articleCell').each(() => {
      const $me = $(this);
      const $title = $me.find('.atc_title a');
      const $time = $me.find('.atc_tm');

      const item = {
        title: $title.text().trim(),
        url: $title.attr('href'),
        time: $time.text().trim()
      };

      // 如果推荐图标存在
      const $img = $me.find('.atc_main .atc_ic_f img');
      item.hasRecommand = $img.hasClass('SG_icon');

      // 删选link
      const s = item.url.match(/blog_([a-zA-Z0-9]+)\.html/);
      if (Array.isArray(s)) {
        item.id = s[1];
        articleList.push(item);
      }
    });

    const nextUrl = $('.SG_pgnext a').attr('href');
    if (nextUrl) {
      BlogSpider(nextUrl, (err, articleList2) => {
        if (err) {
          return callback(err);
        }
        callback(null, articleList.concat(articleList2));
      });
    } else {
      callback(null, articleList);
    }
  });
}

BlogSpider(config.url, (err, articleList) => {
  if (err) {
    return log.error(err.stack);
  }
  let listContents = '';
  articleList.map((article) => {
    // 判断是否为新浪推荐文章
    if (article.hasRecommand) {
      listContents += '荐 ';
    }
  });
  writeIntoFile(listContents);
});