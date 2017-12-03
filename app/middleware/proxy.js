const httpProxy = require('http-proxy');
const atob = require('atob');

module.exports = (options) => {
  return async function proxy(ctx, next) {
    if (ctx.query.target) {
      const target = decodeURI(atob(ctx.query.target));
      const proxy = httpProxy.createProxyServer({});
      proxy.on('proxyReq', function(proxyReq, req, res, options) {
        proxyReq.setHeader('refer', target);
      });
      proxy.web(ctx.req, ctx.res, {
        target,
        changeOrigin: true,
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
      await next();
    }
  };
};
