'use strict';
const url = require('url');

const WHITE_LIST = [
  '/',
  '/feedback',
  '/ss/queryConfig',
];

const PROXY_PATH = '/proxy';

const REDIRECT_REGEX = /^201|30(1|2|7|8)$/;

function ignore(ctx) {
  if (!ctx.target) {
    const referer = url.parse(ctx.headers.referer || '', true);
    ctx.target = (ctx.path === PROXY_PATH && ctx.query.target) || referer.query.target || ctx.cookies.get('target');
  }
  return !WHITE_LIST.includes(ctx.path) || (ctx.cookies.get('redirect') && ctx.target);
}

module.exports = appInfo => {
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1512282645887_7800';

  // add your config here
  config.middleware = [ 'proxy' ];

  config.view = {
    defaultViewEngine: 'nunjucks',
    mapping: {
      '.nj': 'nunjucks',
    },
  };

  config.security = {
    xframe: {
      ignore,
    },
    xssProtection: {
      ignore,
    },
    nosniff: {
      ignore,
    },
    noopen: {
      ignore,
    },
    csrf: {
      ignore,
    },
  };

  config.meta = {
    ignore,
  };

  config.proxy = {
    whiteList: WHITE_LIST,
    proxyPath: PROXY_PATH,
    redirectRegex: REDIRECT_REGEX,
  };

  return config;
};
