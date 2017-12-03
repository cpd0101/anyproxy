'use strict';

const httpProxy = require('http-proxy');
const atob = require('atob');
const parse = require('url-parse');

const WHITE_LIST = [
  '/',
];

module.exports = (options) => {
  return async function proxy(ctx, next) {
    const refer = parse(ctx.header.referer, true);
    const target = ctx.query.target || refer.query.target || ctx.cookies.get('target');
    if ((ctx.query.target || refer.query.target) || (!WHITE_LIST.includes(ctx.path) && ctx.cookies.get('target'))) {
      ctx.cookies.set('target', target);
      const targetURL = decodeURI(atob(target));
      const proxy = httpProxy.createProxyServer({});
      proxy.on('proxyReq', function(proxyReq, req, res, options) {
        proxyReq.setHeader('referer', targetURL);
      });
      proxy.web(ctx.req, ctx.res, {
        target: targetURL,
        changeOrigin: true,
        cookieDomainRewrite: {
          '*': ctx.hostname,
        },
        headers: {
          referer: targetURL,
        },
      });
      await new Promise((resolve, reject) => {
        proxy.on('end', function (req, res, proxyRes) {
          resolve(proxyRes);
        });
        proxy.on('error', function (err, req, res) {
          reject(err);
        });
      });
    } else {
      ctx.cookies.set('target', null);
      await next();
    }
  };
};
