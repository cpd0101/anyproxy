'use strict';

const WHITE_LIST = [
  '/',
  '/feedback',
];

function ignore(ctx) {
  return !WHITE_LIST.includes(ctx.path) || ctx.cookies.get('redirect');
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
      enable: false,
    },
  };

  config.meta = {
    ignore,
  };

  config.proxy = {
    whiteList: WHITE_LIST,
    proxyPath: '/proxy',
    redirectRegex: /^201|30(1|2|7|8)$/,
  };

  return config;
};
