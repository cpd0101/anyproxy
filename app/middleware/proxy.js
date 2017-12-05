'use strict';

const httpProxy = require('http-proxy');
const url = require('url');
const atob = require('atob');

module.exports = ({ whiteList = [], proxyPath, redirectStatusCode = [] }) => {
  return async function proxy(ctx, next) {
    await next();
    const targetRequest = ctx.path === proxyPath && ctx.query.target;
    const target = targetRequest || ctx.cookies.get('target');
    const redirect = ctx.cookies.get('redirect');
    if (whiteList.includes(ctx.path) && !redirect) {
      ctx.cookies.set('target', null);
    } else if (target) {
      if (targetRequest) {
        const referer = url.parse(ctx.headers.referer);
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
        prependPath: !!targetRequest,
        ignorePath: !!targetRequest,
        autoRewrite: true,
        protocolRewrite: 'http',
        cookieDomainRewrite: {
          '*': ctx.hostname,
        },
      });
      proxy.on('proxyRes', function (proxyRes, req, res) {
        let hasSetCookie = false;
        if (targetRequest && ctx.query.nocookie !== 'true') {
          ctx.cookies.set('target', target);
          hasSetCookie = true;
        }
        if (redirectStatusCode.includes(proxyRes.statusCode) && !redirect) {
          const redirectURL = url.parse(proxyRes.headers['location']);
          if (whiteList.includes(redirectURL.path)) {
            ctx.cookies.set('redirect', redirectURL.path);
            hasSetCookie = true;
          }
        }
        if (redirect === ctx.path) {
          ctx.cookies.set('redirect', null);
          hasSetCookie = true;
        }
        if (hasSetCookie) {
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
