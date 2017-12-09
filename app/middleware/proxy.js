'use strict';

const url = require('url');
const zlib = require('zlib');
const httpProxy = require('http-proxy-self');
const httpMocks = require('node-mocks-http-self');
const parse5 = require('parse5');

let web_o = require('http-proxy-self/lib/http-proxy/passes/web-outgoing');
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

function toBoolean(str) {
  if (typeof str === 'boolean') {
    return str;
  }
  if (str === 'false') {
    return false;
  } else if (str === 'true') {
    return true;
  } else {
    return !!Number(str);
  }
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

function getProxyURL(ctx, src, nocookie) {
  if (typeof src === 'string') {
    if (/^\/\//.test(src)) {
      const targetURL = url.parse(decodeURI(atob(ctx.target)));
      src = targetURL.protocol + src;
    }
    if (/^\//.test(src)) {
      return src;
    }
    if (/^data\:/.test(src)) {
      return src;
    }
    if (/^javascript\:/.test(src)) {
      return src;
    }
    return `/proxy?target=${btoa(encodeURI(src))}&nocookie=${nocookie}`;
  }
  return src;
}

function rewriteLocation(ctx, proxyRes, options) {
  const target = url.parse(options.target);
  const u = url.parse(proxyRes.headers['location'] || '');

  if (u.host && target.host !== u.host && ctx.hostname !== u.hostname) {
    proxyRes.headers['location'] = getProxyURL(ctx, u.format(), options.nocookie);
    return true;
  }

  return false;
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
    const fragmentStr = '<script src="/public/jquery.min.js"></script>' +
      '<script src="/public/js-cookie.min.js"></script>' +
      '<script src="/public/proxy.js"></script>' +
      '<script src="https://hm.baidu.com/hm.js?9ec911f310714b9fcfafe801ba8ae42a"></script>';
    const fragment = parse5.parseFragment(fragmentStr);
    node.childNodes = node.childNodes || [];
    node.childNodes = node.childNodes.concat(fragment.childNodes);
  }
}

async function doProxy(ctx, { whiteList, proxyPath, redirectRegex }) {
  const isTargetRequest = ctx.path === proxyPath && ctx.query.target;
  const targetURL = decodeURI(atob(ctx.target));
  const options = {
    target: targetURL,
    changeOrigin: true,
    prependPath: isTargetRequest,
    ignorePath: isTargetRequest,
    autoRewrite: true,
    protocolRewrite: 'https:',
    cookieDomainRewrite: {
      '*': ctx.hostname,
    },
    proxyTimeout: 15 * 1000,
    selfHandleResponse: true,
  };
  let isOk = false;
  let isRedirect= false;
  let isHtml = false;
  let isUTF8 = false;
  let isMocks = false;
  let isRewriteLocation = false;
  let response = ctx.res;
  let timerId = null;
  const proxy = httpProxy.createProxyServer({});
  proxy.on('proxyReq', function (proxyReq) {
    proxyReq.setHeader('referer', targetURL);
    proxyReq.setHeader('accept-encoding', 'gzip');
  });
  proxy.on('proxyRes', function (proxyRes) {
    if (proxyRes.statusCode === 200) {
      isOk = true;
    }
    if (detectHeader(proxyRes, 'content-type', 'utf-8') || !detectHeader(proxyRes, 'content-type', 'charset')) {
      isUTF8 = true;
    }
    if (detectHeader(proxyRes, 'content-type', 'text/html')) {
      isHtml = true;
    }
    if (isOk && isHtml && isUTF8) {
      response = httpMocks.createResponse();
      isMocks = true;
    }
    if (redirectRegex.test(proxyRes.statusCode)) {
      isRedirect = true;
      isRewriteLocation = rewriteLocation(ctx, proxyRes, {
        ...options,
        nocookie: !isHtml,
      });
    }
    let hasSetCookie = false;
    if (isTargetRequest && !toBoolean(ctx.query.nocookie)) {
      ctx.cookies.set('target', ctx.target, {
        httpOnly: false,
      });
      hasSetCookie = true;
    }
    if (ctx.cookies.get('redirect') === ctx.path) {
      ctx.cookies.set('redirect', null);
      hasSetCookie = true;
    }
    if (isRedirect) {
      const tURL = url.parse(targetURL);
      const uURL = url.parse(proxyRes.headers['location'] || '');
      if (!isRewriteLocation && whiteList.includes(uURL.pathname)) {
        ctx.cookies.set('redirect', uURL.pathname);
        hasSetCookie = true;
      }
    }
    if (hasSetCookie) {
      const set_cookie = proxyRes.headers['set-cookie'] || [];
      proxyRes.headers['set-cookie'] = set_cookie.concat(ctx.response.headers['set-cookie']);
    }
    delete proxyRes.headers['content-security-policy'];
    delete proxyRes.headers['content-security-policy-report-only'];
    for (let i = 0; i < web_o.length; i++) {
      if (web_o[i](ctx.req, response, proxyRes, options)) { break; }
    }
    proxyRes.pipe(response);
    timerId = setTimeout(() => {
      proxyRes.destroy();
    }, 30 * 1000)
  });
  proxy.web(ctx.req, ctx.res, options);
  await new Promise((resolve, reject) => {
    proxy.on('error', function (err) {
      timerId && clearTimeout(timerId);
      reject(err);
    });
    proxy.on('end', function () {
      timerId && clearTimeout(timerId);
      if (isMocks) {
        response.headers = response._headers;
        const buffer = response._getData() ? Buffer.from(response._getData()) : response._getBuffer();
        if (detectHeader(response, 'content-encoding', 'gzip')) {
          const html = zlib.gunzipSync(buffer);
          const document = parse5.parse(html.toString());
          handleNode(ctx, document, true);
          ctx.body = zlib.gzipSync(Buffer.from(parse5.serialize(document)));
        } else {
          const doc = parse5.parse(buffer.toString());
          handleNode(ctx, doc, true);
          ctx.body = Buffer.from(parse5.serialize(doc));
        }
        for (let i = 0; i < web_o.length; i++) {
          if (web_o[i](ctx.req, ctx.res, response, options)) {
            break;
          }
        }
      }
      resolve();
    });
  });
}

module.exports = ({ whiteList = [], proxyPath, redirectRegex }) => {
  return async function proxy(ctx, next) {
    await next();
    const referer = url.parse(ctx.headers.referer || '', true);
    ctx.target = (ctx.path === proxyPath && ctx.query.target) || referer.query.target || ctx.cookies.get('target');
    if (whiteList.includes(ctx.path) && !ctx.cookies.get('redirect')) {
      ctx.cookies.set('target', null, {
        httpOnly: false,
      });
    } else if (ctx.target) {
      await doProxy(ctx, {
        whiteList,
        proxyPath,
        redirectRegex,
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
