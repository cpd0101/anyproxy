'use strict';

const httpProxy = require('http-proxy');
const parse = require('url-parse');
const cookie = require('cookie');

const WHITE_LIST = [
  '/',
];

module.exports = (options) => {
  return async function proxy(ctx, next) {
    const refer = parse(ctx.headers.referer, true);
    const cookies = cookie.parse(ctx.headers.cookie || '');
    const target = ctx.query.target || refer.query.target || cookies.target;
    if ((ctx.query.target || refer.query.target) || (!WHITE_LIST.includes(ctx.path) && cookies.target)) {
      const proxy = httpProxy.createProxyServer({});
      proxy.on('proxyReq', function(proxyReq, req, res, options) {
        proxyReq.setHeader('referer', target);
      });
      proxy.web(ctx.req, ctx.res, {
        target: target,
        changeOrigin: true,
        cookieDomainRewrite: {
          '*': ctx.hostname,
        },
        headers: {
          referer: target,
        },
      });
      proxy.on('proxyRes', function (proxyRes, req, res) {
        if (!cookies.target) {
          const set_cookie = proxyRes.headers['set-cookie'] || [];
          proxyRes.headers['set-cookie'] = set_cookie.concat([`target=${target}; path=/; httponly`]);
        }
      });
      await new Promise((resolve, reject) => {
        proxy.on('error', function (err, req, res) {
          reject(err);
        });
        proxy.on('end', function (req, res, proxyRes) {
          resolve();
        });
      });
    } else {
      ctx.cookies.set('target', null);
      await next();
    }
  };
};
