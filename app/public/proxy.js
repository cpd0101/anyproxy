(function () {
  var $ = window.jQuery.noConflict();
  var Cookies = window.Cookies.noConflict();
  function getProxyURL(src, nocookie) {
    if (typeof src === 'string') {
      if (/^\/\//.test(src)) {
        var target = decodeURI(atob(Cookies.get('target')));
        var isHttps = /^https\:\/\//.test(target);
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
      return '/proxy?target=' + btoa(encodeURI(src)) + '&nocookie=' + nocookie;
    }
    return src;
  }

  $('img').each(function() {
    var src = $(this).attr('src');
    $(this).attr('src', getProxyURL(src, true));
  });

  $('a').each(function() {
    var href = $(this).attr('href');
    $(this).attr('href', getProxyURL(href, ''));
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
