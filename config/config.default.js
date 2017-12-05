'use strict';

const WHITE_LIST = [
  '/',
];

const REDIRECT_STATUS_CODE = [
  201,
  301,
  302,
  307,
  308,
];

function ignore(ctx) {
  return !WHITE_LIST.includes(ctx.path);
}

module.exports = appInfo => {
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1512282645887_7800';

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
  };

  config.meta = {
    ignore,
  };

  config.proxy = {
    whiteList: WHITE_LIST,
    proxyPath: '/proxy',
    redirectStatusCode: REDIRECT_STATUS_CODE,
  };

  // add your config here
  config.middleware = [ 'proxy' ];

  return config;
};
