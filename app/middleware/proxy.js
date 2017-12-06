'use strict';

const url = require('url');
const zlib = require('zlib');
const httpProxy = require('http-proxy');
const httpMocks = require('node-mocks-http-self');
const parse5 = require('parse5');

let web_o = require('http-proxy/lib/http-proxy/passes/web-outgoing');
web_o = Object.keys(web_o).map(function(pass) {
  return web_o[pass];
});

function atob(str) {
  return new Buffer(str, 'base64').toString('binary');
}

function btoa(str) {
  return new Buffer(str, 'binary').toString('base64');
}

function toLowerCase(str) {
  if (typeof str === 'string') {
    return str.toLowerCase();
  }
  return str;
}

function getAttribute(attrs, name) {
  if (Array.isArray(attrs)) {
    for (let i = 0; i < attrs.length; i++) {
      if (toLowerCase(attrs[i].name) === name) {
        return attrs[i].value;
      }
    }
  }
}

function setAttribute(attrs, name, value) {
  if (Array.isArray(attrs)) {
    attrs.map(attr => {
      if (attr && (toLowerCase(attr.name) === name)) {
        attr.value = value;
      }
      return attr;
    });
  }
}

function detectHeader(res, key, value) {
  if (res.headers[key] && toLowerCase(res.headers[key]).indexOf(toLowerCase(value)) > -1) {
    return true;
  }
  return false;
}

function isGoogleSearch(ctx, target) {
  const targetURL = url.parse(decodeURI(atob(target)));
  if (targetURL.host && targetURL.host.indexOf('google.com') > -1 && ctx.path === '/search') {
    ctx.isGoogleSearch = true;
    return true;
  }
  return false;
}

function getProxyURL(ctx, src) {
  if (typeof src === 'string') {
    if (/^\/\//.test(src)) {
      const target = decodeURI(atob(ctx.query.target || ctx.cookies.get('target')));
      const targetURL = url.parse(target);
      src = targetURL.protocol + src;
    }
    if (/^\//.test(src)) {
      return src;
    }
    return `/proxy?target=${btoa(encodeURI(src))}&_csrf=${ctx.csrf}&nocookie=true`;
  }
  return src;
}

function handleNode(ctx, node, recurve) {
  if (!node) {
    return;
  }
  const tagName = toLowerCase(node.tagName);
  if (tagName === 'meta') {
    const http_equiv = toLowerCase(getAttribute(node.attrs, 'http-equiv'));
    if (http_equiv === 'content-security-policy' || http_equiv === 'content-security-policy-report-only') {
      setAttribute(node.attrs, 'http-equiv', '');
    }
  }
  if (tagName === 'link') {
    const href = getAttribute(node.attrs, 'href');
    const rel = toLowerCase(getAttribute(node.attrs, 'rel'));
    const type = toLowerCase(getAttribute(node.attrs, 'type'));
    if (rel === 'stylesheet' || type === 'text/css') {
      setAttribute(node.attrs, 'href', getProxyURL(ctx, href));
    }
    if (rel === 'shortcut icon') {
      setAttribute(node.attrs, 'href', '/public/favicon.ico');
    }
  }
  if (tagName === 'script') {
    const src = getAttribute(node.attrs, 'src');
    setAttribute(node.attrs, 'src', getProxyURL(ctx, src));
  }
  if (Array.isArray(node.childNodes) && recurve) {
    if (tagName === 'head' || tagName === 'body') {
      recurve = false;
    }
    node.childNodes.map(childNode => handleNode(ctx, childNode, recurve));
  }
  if (tagName === 'body') {
    let fragmentStr =
      '<script>if (typeof define === "function" && define.amd) { window.oldDefineAmd = define.amd; define.amd = undefined; }</script>' +
      '<script src="https://cdn.bootcss.com/jquery/3.2.1/jquery.min.js"></script>' +
      '<script src="https://gw.alipayobjects.com/os/rmsportal/PGCnHSklorQGuDaFjAyc.js"></script>' +
      '<script>if (window.oldDefineAmd) { define.amd = window.oldDefineAmd; }</script>' +
      '<script src="/public/proxy.js"></script>' +
      '<script src="https://hm.baidu.com/hm.js?9ec911f310714b9fcfafe801ba8ae42a"></script>';
    const fragment = parse5.parseFragment(fragmentStr);
    node.childNodes = node.childNodes || [];
    node.childNodes = node.childNodes.concat(fragment.childNodes);
  }
}

async function doProxy(ctx, req, res, options) {
  const { whiteList, redirectRegex, target, isTargetRequest, isStream } = options;
  const targetURL = decodeURI(atob(target));
  const proxy = httpProxy.createProxyServer({});
  proxy.on('proxyReq', function(proxyReq) {
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
    proxyTimeout: 15 * 1000,
  });
  proxy.on('proxyRes', function (proxyRes) {
    const content_length = proxyRes.headers['content-length'];
    if (!isStream && !(detectHeader(proxyRes, 'content-type', 'text') || detectHeader(proxyRes, 'content-type', 'image') ||
      detectHeader(proxyRes, 'content-type', 'javascript') || detectHeader(proxyRes, 'content-type', 'css') ||
      (!detectHeader(proxyRes, 'transfer-encoding', 'chunked') && content_length && content_length <= 500 * 1024 * 8))) {
      proxyRes.destroy(new Error('403 Forbidden'));
    }
    let hasSetCookie = false;
    if (isTargetRequest && !ctx.query.nocookie) {
      ctx.cookies.set('target', target, {
        httpOnly: false,
      });
      hasSetCookie = true;
    }
    const redirect = ctx.cookies.get('redirect');
    if (redirectRegex.test(proxyRes.statusCode) && !redirect) {
      const redirectURL = url.parse(proxyRes.headers.location || '');
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
    proxy.on('error', function (err) {
      reject(err);
    });
    proxy.on('end', function () {
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
      ctx.cookies.set('target', null, {
        httpOnly: false,
      });
    } else if (target) {
      if (targetRequest || isGoogleSearch(ctx, target)) {
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
          const buffer = response._getData() ? Buffer.from(response._getData()) : response._getBuffer();
          if (response.statusCode === 200 && detectHeader(response, 'content-type', 'text/html') &&
            (detectHeader(response, 'content-type', 'utf-8') || !detectHeader(response, 'content-type', 'charset'))) {
            if (detectHeader(response, 'content-encoding', 'gzip')) {
              const html = zlib.gunzipSync(buffer);
              const document = parse5.parse(html.toString());
              handleNode(ctx, document, true);
              ctx.body = zlib.gzipSync(Buffer.from(parse5.serialize(document)));
              return;
            }
          }
          ctx.body = buffer;
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
      if (/\.ico$/.test(ctx.path)) {
        ctx.redirect('/public/favicon.ico');
      } else {
        ctx.redirect('/');
      }
    }
  };
};
