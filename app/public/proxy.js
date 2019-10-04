(function () {
  var $ = window.jQuery.noConflict();
  var Cookies = window.Cookies.noConflict();

  if (navigator.serviceWorker && location.protocol === 'https:') {
    navigator.serviceWorker.register('/service-worker.js');
  }

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
  var target = (location.pathname === '/proxy' && (query.target || btoa(encodeURI(query.url || ''))));
  var targetURL = decodeURI(atob(target || Cookies.get('target') || ''));

  function getProxyURL(src, nocookie) {
    if (typeof src === 'string') {
      if (/^\/\//.test(src)) {
        var isHttps = /^https\:/.test(targetURL);
        if (isHttps) {
          src = 'https:' + src;
        } else {
          src = 'http:' + src;
        }
      }
      if (!/^http(s)?\:/.test(src)) {
        return src;
      }
      var reg = window.DOMAIN_WHITE_LIST;
      if (reg && typeof reg.test === 'function' && reg.test(src)) {
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

  if (!toBoolean(query.noframe)) {
    window._hmt = window._hmt || [];

    if (navigator.serviceWorker) {
      var adsHtml = $('<div style="display:none;position:fixed;bottom:32px;right:32px;z-index:999;">' +
        '<span class="ads-close" style="position:absolute;top:0;right:-32px;width:28px;height:14px;line-height:14px;text-align:left;cursor:pointer;">' +
          '<div style="width:14px;font-size:12px;color:#555;background:#eee;text-align:center;">X</div>' +
        '</span>' +
        '<iframe id="ads-iframe" border="0" frameborder="0" scrolling="no" marginwidth="0" allowtransparency="true" marginheight="0" src="https://www.anyproxy.cn/ads.html" />' +
      '</div>');
      adsHtml.on('click', function (e) {
        adsHtml.remove();
        _hmt.push(['_trackEvent', 'ads', 'close']);
      }).on('click', '.ads-close', function (e) {
        e.stopImmediatePropagation();
        e.stopPropagation();
        adsHtml.remove();
        _hmt.push(['_trackEvent', 'ads', 'close']);
        return false;
      });
      window.onmessage = function (e) {
        if (e.data && e.data === 'click') {
          _hmt.push(['_trackEvent', 'ads', 'access']);
          return;
        }
        if (e.data && e.data === 'show') {
          adsHtml.show();
          _hmt.push(['_trackEvent', 'ads', 'show']);
          return;
        }
        if (e.data && typeof e.data.indexOf === 'function' && e.data.indexOf('x') > 0) {
          var arr = e.data.split('x');
          var width = +arr[0] + 2;
          var height = +arr[1] + 2;
          if (width && height) {
            adsHtml.width(width).height(height).find('#ads-iframe').width(width).height(height);
            adsHtml.show();
          }
          return;
        }
      };
      $('body').append(adsHtml);
    }

    var backHtml = $('<div style="position:fixed;bottom:32px;right:32px;width:32px;height:32px;box-sizing:content-box;padding:8px;line-height:16px;text-align:center;background:#eee;opacity:0.7;cursor:pointer;z-index:9999;">' +
      '<span class="origin-back-close" style="position:absolute;top:0;right:-32px;width:28px;height:14px;line-height:14px;text-align:left;">' +
        '<div style="width:14px;font-size:12px;color:#555;background:#eee;text-align:center;">X</div>' +
      '</span>' +
      '<span style="font-size:14px;color:#555;">\u8bbf\u95ee<br />\u6e90\u7ad9</span>' +
    '</div>');
    backHtml.on('click', function (e) {
      var href = decodeURI(atob(target || ''));
      if (!href) {
        href = getOrigin(decodeURI(atob(Cookies.get('target') || ''))) + location.pathname + location.search + location.hash;
      }
      _hmt.push(['_trackEvent', 'origin', 'back-access']);
      window.open(href);
    }).on('click', '.origin-back-close', function (e) {
      e.stopImmediatePropagation();
      e.stopPropagation();
      backHtml.remove();
      _hmt.push(['_trackEvent', 'origin', 'back-close']);
      return false;
    });
    $('body').append(backHtml);
  }
})();
