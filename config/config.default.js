'use strict';

function ignore(ctx) {
  return ctx.path !== '/' || ctx.query.target;
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

  // add your config here
  config.middleware = [ 'proxy' ];

  return config;
};
