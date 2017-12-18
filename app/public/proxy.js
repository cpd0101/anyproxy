(function () {
  var $ = window.jQuery.noConflict();
  var Cookies = window.Cookies.noConflict();
  var target = decodeURI(atob(Cookies.get('target')));
  function getProxyURL(src, nocookie) {
    if (typeof src === 'string') {
      if (/^\/\//.test(src)) {
        var isHttps = /^https\:/.test(target);
        if (isHttps) {
          src = 'https:' + src;
        } else {
          src = 'http:' + src;
        }
      }
      if (/^data\:/.test(src)) {
        return src;
      }
      if (/^javascript\:/.test(src)) {
        return src;
      }
      if (/^\//.test(src)) {
        return src;
      }
      if (!/^http(s)?\:/.test(src)) {
        return src;
      }
      var reg = window.DOMAIN_WHITE_LIST || /^http(s)?\:\/\/(.+\.)?(anyproxy|proxyit|baidu|zhihu|sohu|alipayobjects|bdstatic)\.(cc|cn|com|net)/i;
      if (reg.test(src)) {
        return src;
      }
      return '/proxy?target=' + btoa(encodeURI(src)) + '&nocookie=' + nocookie;
    }
    return src;
  }

  $('img').each(function () {
    var src = $(this).attr('src');
    if (!navigator.serviceWorker || /^http\:/.test(src)) {
      $(this).attr('src', getProxyURL(src, true));
    }
  });

  $('a').each(function () {
    var href = $(this).attr('href');
    $(this).attr('href', getProxyURL(href, false));
    $(this).attr('onmousedown', '');
    this.onmousedown = function (e) {
      e.stopImmediatePropagation();
      e.stopPropagation();
    };
  });

  document.addEventListener('mousedown', function (e) {
    if (e.target.tagName.toLocaleLowerCase() === 'a') {
      e.stopImmediatePropagation();
      e.stopPropagation();
    }
  }, true);

  function getQuery(search) {
    var match = null;
    var urlParams = {};
    var reg = /([^=&#]+)=([^&#]*)/ig;
    var query = search.slice(1);
    while (match = reg.exec(query)) {
      urlParams[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);
    }
    return urlParams;
  }

  function getOrigin(href) {
    var reg = /^(http[s]?\:\/\/[^\/]+)/i;
    var match = reg.exec(href);
    if (match) {
      return match[0];
    }
    return '';
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

  var query = getQuery(location.search);

  if (!toBoolean(query.noframe)) {
    window._hmt = window._hmt || [];
    var backHtml = $('<div style="position:fixed;bottom:32px;right:32px;width:32px;height:32px;box-sizing:content-box;padding:8px;line-height:16px;text-align:center;background:#eee;opacity:0.7;cursor:pointer;z-index:999999999;">' +
        '<span class="origin-back-close" style="position:absolute;top:0;right:-18px;width:14px;height:14px;line-height:14px;font-size:12px;color:#555;background:#eee;">X</span>' +
        '<span style="line-height:16px;font-size:14px;color:#555;">访问<br>源站</span>' +
      '</div>');
    backHtml.on('click', function (e) {
      var href = decodeURI(atob(query.target || ''));
      if (!href) {
        href = getOrigin(decodeURI(atob(Cookies.get('target') || ''))) + location.pathname + location.search + location.hash;
      }
      _hmt.push(['_trackEvent', 'origin', 'origin-back-access']);
      window.open(href);
    }).on('click', '.origin-back-close', function (e) {
      e.stopPropagation();
      backHtml.remove();
      _hmt.push(['_trackEvent', 'origin', 'origin-back-close']);
      return false;
    });
    $('body').append(backHtml);
  }
})();
