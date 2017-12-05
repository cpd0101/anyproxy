'use strict';

const httpProxy = require('http-proxy');
const url = require('url');
const atob = require('atob');
const httpMocks = require('node-mocks-http-self');
const zlib = require('zlib');

let web_o = require('http-proxy/lib/http-proxy/passes/web-outgoing');
web_o = Object.keys(web_o).map(function(pass) {
  return web_o[pass];
});

function detectHeader(res, key, value) {
  if (res.headers[key] && res.headers[key].indexOf(value) !== -1) {
    return true;
  }
  return false;
}

async function doProxy(ctx, req, res, options) {
  const { whiteList, redirectRegex, target, isTargetRequest, isStream } = options;
  const targetURL = decodeURI(atob(target));
  const proxy = httpProxy.createProxyServer({});
  proxy.on('proxyReq', function(proxyReq, req, res, options) {
    proxyReq.setHeader('referer', targetURL);
  });
  proxy.web(req, res, {
    target: targetURL,
    changeOrigin: true,
    prependPath: isTargetRequest,
    ignorePath: isTargetRequest,
    autoRewrite: true,
    protocolRewrite: 'http',
    cookieDomainRewrite: {
      '*': ctx.hostname,
    },
  });
  proxy.on('proxyRes', function (proxyRes, req, res) {
    const content_length = proxyRes.headers['content-length'];
    if (!isStream && !(detectHeader(proxyRes, 'content-type', 'text') || detectHeader(proxyRes, 'content-type', 'image') ||
      detectHeader(proxyRes, 'content-type', 'javascript') || detectHeader(proxyRes, 'content-type', 'css') ||
      (!detectHeader(proxyRes, 'transfer-encoding', 'chunked') && content_length && content_length <= 500 * 1024 * 8))) {
      proxyRes.destroy(new Error('403 Forbidden'));
    }
    let hasSetCookie = false;
    if (isTargetRequest && !ctx.query.nocookie) {
      ctx.cookies.set('target', target);
      hasSetCookie = true;
    }
    const redirect = ctx.cookies.get('redirect');
    if (redirectRegex.test(proxyRes.statusCode) && !redirect) {
      const redirectURL = url.parse(proxyRes.headers['location'] || '');
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
    delete proxyRes.headers['content-security-policy'];
    delete proxyRes.headers['content-security-policy-report-only'];
  });
  await new Promise((resolve, reject) => {
    proxy.on('error', function (err, req, res) {
      reject(err);
    });
    proxy.on('end', function (req, res, proxyRes) {
      resolve();
    });
  });
}

module.exports = ({ whiteList = [], proxyPath, redirectRegex }) => {
  return async function proxy(ctx, next) {
    await next();
    const targetRequest = ctx.path === proxyPath && ctx.query.target;
    const target = targetRequest || ctx.cookies.get('target');
    if (whiteList.includes(ctx.path) && !ctx.cookies.get('redirect')) {
      ctx.cookies.set('target', null);
    } else if (target) {
      if (targetRequest) {
        const referer = url.parse(ctx.headers.referer || '');
        if (referer.hostname !== ctx.hostname) {
          return ctx.redirect('/');
        }
        ctx.assertCsrf();
        if (!ctx.query.nocookie) {
          const response = httpMocks.createResponse();
          await doProxy(ctx, ctx.req, response, {
            whiteList,
            redirectRegex,
            target,
            isTargetRequest: !!targetRequest,
            isStream: false,
          });
          response.headers = response._headers;
          for (let i = 0; i < web_o.length; i++) {
            if (web_o[i](ctx.req, ctx.res, response, {})) {
              break;
            }
          }
          if (detectHeader(response, 'content-type', 'text/html') && detectHeader(response, 'content-type', 'utf-8')) {
            if (detectHeader(response, 'content-encoding', 'gzip')) {
              const html = zlib.gunzipSync(response._getBuffer());
              ctx.body = zlib.gzipSync(html);
              return;
            }
          }
          ctx.body = response._getBuffer();
          return;
        }
      }
      await doProxy(ctx, ctx.req, ctx.res, {
        whiteList,
        redirectRegex,
        target,
        isTargetRequest: !!targetRequest,
        isStream: true,
      });
    } else {
      ctx.redirect('/');
    }
  };
};
