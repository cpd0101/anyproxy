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
      if (/^\//.test(src)) {
        return src;
      }
      if (/^data\:/.test(src)) {
        return src;
      }
      if (/^javascript\:/.test(src)) {
        return src;
      }
      var reg = /^http(s)?\:\/\/(.+\.)?(anyproxy|proxyit|baidu|sohu)\.(cc|cn|com)/i;
      if (reg.test(src)) {
        return src;
      }
      return '/proxy?target=' + btoa(encodeURI(src)) + '&nocookie=' + nocookie;
    }
    return src;
  }

  $('img').each(function () {
    var src = $(this).attr('src');
    if (!(navigator.serviceWorker && !/^http\:/.test(src))) {
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
})();
