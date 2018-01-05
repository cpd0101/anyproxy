'use strict';

const stream = require('stream');
const url = require('url');
const zlib = require('zlib');
const iconv = require('iconv-lite');
const jschardet = require('jschardet');
const parse5 = require('parse5');
const httpProxy = require('http-proxy-self');
const httpMocks = require('node-mocks-http-self');
const DOMAIN_WHITE_LIST = require('../common/common').DOMAIN_WHITE_LIST;

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
  }
  return !!Number(str);
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
  let canFind = false;
  if (Array.isArray(attrs)) {
    for (let i = 0; i < attrs.length; i++) {
      if (toLowerCase(attrs[i].name) === name) {
        attrs[i].value = value;
        canFind = true;
        break;
      }
    }
  }
  if (!canFind && value) {
    attrs.push({
      name,
      value,
    });
  }
  return canFind;
}

function replaceOrigin(ctx, href) {
  if (!href) {
    return href;
  }
  const hrefURL = url.parse(href);
  hrefURL.protocol = `${ctx.protocol}:`;
  hrefURL.host = ctx.host;
  return url.format(hrefURL);
}

function detectHeader(res, key, value) {
  if (res.headers[key] && toLowerCase(res.headers[key]).indexOf(toLowerCase(value)) > -1) {
    return true;
  }
  return false;
}

function getProxyURL(ctx, src, nocookie, target) {
  if (typeof src === 'string') {
    if (/^\/\//.test(src)) {
      const targetURL = url.parse(decodeURI(atob(target)));
      src = targetURL.protocol + src;
    }
    if (!/^http(s)?\:/.test(src)) {
      return src;
    }
    if (DOMAIN_WHITE_LIST.test(src)) {
      return src;
    }
    return `/proxy?target=${btoa(encodeURI(src))}&nocookie=${nocookie}`;
  }
  return src;
}

function rewriteLocation(ctx, proxyRes, options) {
  const target = url.parse(options.target);
  const u = url.parse(proxyRes.headers['location'] || '');

  if (ctx.hostname !== u.hostname && ((u.host && target.host !== u.host) || (u.protocol && target.protocol !== u.protocol))) {
    proxyRes.headers['location'] = getProxyURL(ctx, u.format(), options.nocookie, btoa(encodeURI(options.target)));
    return true;
  }

  return false;
}

function handleNode(ctx, node, recurve, target) {
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
  if (tagName === 'base') {
    const href = getAttribute(node.attrs, 'href');
    setAttribute(node.attrs, 'href', replaceOrigin(ctx, href));
    setAttribute(node.attrs, 'data-href', href);
  }
  if (tagName === 'link') {
    const href = getAttribute(node.attrs, 'href');
    const rel = toLowerCase(getAttribute(node.attrs, 'rel'));
    const type = toLowerCase(getAttribute(node.attrs, 'type'));
    if (rel === 'stylesheet' || type === 'text/css') {
      setAttribute(node.attrs, 'href', getProxyURL(ctx, href, true, target));
    }
    if (rel === 'shortcut icon') {
      setAttribute(node.attrs, 'href', '/favicon.ico');
    }
  }
  if (tagName === 'script') {
    const src = getAttribute(node.attrs, 'src');
    setAttribute(node.attrs, 'src', getProxyURL(ctx, src, true, target));
  }
  if (Array.isArray(node.childNodes) && recurve) {
    if (tagName === 'head' || tagName === 'body') {
      recurve = false;
    }
    node.childNodes.map(childNode => handleNode(ctx, childNode, recurve, target));
  }
  if (tagName === 'body') {
    const fragmentStr = '<script src="https://gw.alipayobjects.com/os/rmsportal/JdEpaOqbNgKDgeKLvRXV.js"></script>' +
      '<script src="https://gw.alipayobjects.com/os/rmsportal/qJcJXiKVpwXIkTwucUKy.js"></script>' +
      '<script src="/public/proxy.js"></script>' +
      '<script src="https://hm.baidu.com/hm.js?9ec911f310714b9fcfafe801ba8ae42a"></script>';
    const fragment = parse5.parseFragment(fragmentStr);
    node.childNodes = node.childNodes || [];
    node.childNodes = node.childNodes.concat(fragment.childNodes);
  }
  if (tagName === 'head') {
    let fragmentStr = `<script>window.DOMAIN_WHITE_LIST = ${DOMAIN_WHITE_LIST.toString()}</script>`;
    if (toBoolean(ctx.query.noframe)) {
      fragmentStr += '<script>typeof window.__defineGetter__ === "function" && window.__defineGetter__("self", function() { return window.top; })</script>' +
        '<script>if (navigator.serviceWorker && location.protocol === "https:") { navigator.serviceWorker.register("/service-worker.js"); }</script>';
    }
    const fragment = parse5.parseFragment(fragmentStr);
    node.childNodes = node.childNodes || [];
    node.childNodes = fragment.childNodes.concat(node.childNodes);
  }
}

async function doProxy(ctx, { whiteList, proxyPath, redirectRegex, targetRequest, target }) {
  const isTargetRequest = !!targetRequest;
  const targetURL = decodeURI(atob(target));
  const bufferStream = new stream.PassThrough();
  bufferStream.end(Buffer.from(ctx.request.rawBody || ''));
  const options = {
    target: targetURL,
    changeOrigin: true,
    prependPath: isTargetRequest,
    ignorePath: isTargetRequest,
    autoRewrite: true,
    protocolRewrite: `${ctx.protocol}:`,
    cookieDomainRewrite: {
      '*': ctx.hostname,
    },
    proxyTimeout: 15 * 1000,
    selfHandleResponse: true,
    buffer: ctx.request.rawBody ? bufferStream : null,
  };
  let isOk = false;
  let isRedirect = false;
  let isHtml = false;
  let isUTF8 = false;
  let isGBK = false;
  let isMocks = false;
  let response = ctx.res;
  let timerId = null;
  const proxy = httpProxy.createProxyServer({});
  proxy.on('proxyReq', function (proxyReq) {
    const referer = url.parse(ctx.headers.referer || '', true);
    const realReferer = decodeURI(atob(referer.query.target || ctx.cookies.get('target') || ''));
    if (realReferer) {
      proxyReq.setHeader('referer', realReferer);
    } else {
      proxyReq.removeHeader('referer');
    }
    proxyReq.removeHeader('origin');
    proxyReq.setHeader('accept-encoding', 'gzip');
    proxyReq.setHeader('accept-charset', 'utf-8');
  });
  proxy.on('proxyRes', function (proxyRes) {
    if (proxyRes.statusCode === 200) {
      isOk = true;
    }
    if (detectHeader(proxyRes, 'content-type', 'text/html')) {
      isHtml = true;
    }
    if (detectHeader(proxyRes, 'content-type', 'utf-8')) {
      isUTF8 = true;
    }
    if (detectHeader(proxyRes, 'content-type', 'gbk')) {
      isGBK = true;
    }
    if (isOk && isHtml && !toBoolean(ctx.query.nocookie)) {
      response = httpMocks.createResponse();
      isMocks = true;
    }
    if (redirectRegex.test(proxyRes.statusCode)) {
      isRedirect = true;
      rewriteLocation(ctx, proxyRes, {
        ...options,
        nocookie: !isHtml,
      });
    }
    let hasSetCookie = false;
    if (isRedirect) {
      const uURL = url.parse(proxyRes.headers['location'] || '');
      if (whiteList.includes(uURL.pathname)) {
        ctx.cookies.set('redirect', uURL.pathname);
        hasSetCookie = true;
      }
    }
    if (!hasSetCookie && ctx.cookies.get('redirect') === ctx.path) {
      ctx.cookies.set('redirect', null);
      hasSetCookie = true;
    }
    if (isTargetRequest && !toBoolean(ctx.query.nocookie)) {
      ctx.cookies.set('target', target, {
        httpOnly: false,
      });
      hasSetCookie = true;
    }
    if (hasSetCookie) {
      const set_cookie = proxyRes.headers['set-cookie'] || [];
      proxyRes.headers['set-cookie'] = set_cookie.concat(ctx.response.headers['set-cookie']);
    }
    delete proxyRes.headers['content-security-policy'];
    delete proxyRes.headers['content-security-policy-report-only'];
    timerId = setTimeout(() => {
      proxyRes.destroy(new Error('Response Timeout'));
      return;
    }, 30 * 1000);
    ctx.set('access-control-allow-origin', '*');
    for (let i = 0; i < web_o.length; i++) {
      if (web_o[i](ctx.req, response, proxyRes, options)) { break; }
    }
    proxyRes.pipe(response);
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
        delete response.headers['content-length'];
        const buffer = response._getData() ? Buffer.from(response._getData()) : response._getBuffer();
        if (detectHeader(response, 'content-encoding', 'gzip')) {
          const html = zlib.gunzipSync(buffer);
          let str = html.toString();
          if (!isUTF8) {
            if (isGBK) {
              str = iconv.decode(html, 'gbk');
            } else {
              if (str.indexOf('�') > -1) {
                const tempStr = iconv.decode(html, 'gbk');
                if (tempStr.indexOf('�') === -1) {
                  isGBK = true;
                  str = tempStr;
                }
              }
            }
          }
          const doc = parse5.parse(str);
          handleNode(ctx, doc, true, target);
          if (isGBK) {
            ctx.body = zlib.gzipSync(iconv.encode(parse5.serialize(doc), 'gbk'));
          } else {
            ctx.body = zlib.gzipSync(Buffer.from(parse5.serialize(doc)));
          }
        } else {
          let str = buffer.toString();
          if (!isUTF8) {
            if (isGBK) {
              str = iconv.decode(buffer, 'gbk');
            } else {
              if (str.indexOf('�') > -1) {
                const tempStr = iconv.decode(buffer, 'gbk');
                if (tempStr.indexOf('�') === -1) {
                  isGBK = true;
                  str = tempStr;
                }
              }
            }
          }
          const doc = parse5.parse(str);
          handleNode(ctx, doc, true, target);
          if (isGBK) {
            ctx.body = iconv.encode(parse5.serialize(doc), 'gbk');
          } else {
            ctx.body = Buffer.from(parse5.serialize(doc));
          }
        }
        ctx.set('cache-control', 'no-cache');
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
    const targetRequest = (ctx.path === proxyPath && (ctx.query.target || btoa(encodeURI(ctx.query.url || ''))));
    const target = targetRequest || referer.query.target || ctx.cookies.get('target');
    if (whiteList.includes(ctx.path) && !(ctx.cookies.get('redirect') && target)) {
      if (ctx.method === 'GET') {
        ctx.cookies.set('target', null, {
          httpOnly: false,
        });
      }
    } else if (target) {
      try {
        await doProxy(ctx, {
          whiteList,
          proxyPath,
          redirectRegex,
          targetRequest,
          target,
        });
      } catch (err) {
        ctx.body = `
          <h3 style="visibility:hidden;">${err.message}</h3>
          <script src="https://hm.baidu.com/hm.js?9ec911f310714b9fcfafe801ba8ae42a"></script>
          <script>
            var _hmt = _hmt || [];
            _hmt.push(['_trackEvent', '404', 'not-found']);
          </script>
          <script type="text/javascript" src="https://qzonestyle.gtimg.cn/qzone/hybrid/app/404/search_children.js" charset="utf-8" homePageUrl="/" homePageName="返回首页"></script>
        `;
        ctx.status = 404;
        ctx.logger.error(err);
      }
    } else {
      ctx.redirect('/');
    }
  };
};
