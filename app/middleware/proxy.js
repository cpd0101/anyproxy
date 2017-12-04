'use strict';

const httpProxy = require('http-proxy');
const parse = require('url-parse');
const atob = require('atob');

module.exports = ({ whiteList = [], proxyPath }) => {
  return async function proxy(ctx, next) {
    await next();
    const targetRequest = ctx.path === proxyPath && ctx.query.target;
    const target = targetRequest || ctx.cookies.get('target');
    if (whiteList.includes(ctx.path)) {
      ctx.cookies.set('target', null);
    } else if (target) {
      if (targetRequest) {
        const referer = parse(ctx.headers.referer, true);
        if (referer.hostname !== ctx.hostname) {
          return ctx.redirect('/');
        }
        ctx.assertCsrf();
      }
      const targetURL = decodeURI(atob(target));
      const proxy = httpProxy.createProxyServer({});
      proxy.on('proxyReq', function(proxyReq, req, res, options) {
        proxyReq.setHeader('referer', targetURL);
      });
      proxy.web(ctx.req, ctx.res, {
        target: targetURL,
        changeOrigin: true,
        prependPath: targetRequest,
        ignorePath: targetRequest,
        cookieDomainRewrite: {
          '*': ctx.hostname,
        },
      });
      proxy.on('proxyRes', function (proxyRes, req, res) {
        if (targetRequest && ctx.query.nocookie !== 'true') {
          ctx.cookies.set('target', target);
          const set_cookie = proxyRes.headers['set-cookie'] || [];
          proxyRes.headers['set-cookie'] = set_cookie.concat(ctx.response.headers['set-cookie']);
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
      ctx.redirect('/');
    }
  };
};
