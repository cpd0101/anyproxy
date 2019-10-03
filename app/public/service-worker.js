this.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = request.url;
  if (!/^http(s)?\:/.test(url)) {
    return;
  }
  var reg = /^http(s)?\:\/\/([^\/]+\.)?(anyproxy|proxyit|baidu|zhihu|sohu|alipayobjects|bdstatic|gtimg|qq|itc|sohucs|tencent|checkdomain)\.(cc|cn|com|net|org|top|de)/i;
  if (reg.test(url)) {
    return;
  }
  url = url.replace(/rf=[^&]*/, 'rf=' + encodeURIComponent(location.href));
  url = url.replace(/dr=[^&]*/, 'dr=');
  var targetURL = 'https://www.proxyit.top/proxy?target=' + btoa(encodeURI(url)) + '&nocookie=true';
  var initOptions = {
    method: request.method,
    headers: request.headers
  };
  if (request.referrer) {
    if (request.referrer.indexOf(location.origin) === 0) {
      initOptions.referrer = request.referrer;
    } else {
      initOptions.referrer = 'https://www.proxyit.top/proxy?target=' + btoa(encodeURI(request.referrer)) + '&nocookie=true';
    }
  }
  var method = request.method.toUpperCase();
  var isClickJs = url.indexOf('https://alimama.alicdn.com/tkapi/click.js') === 0;
  if (method === 'GET' || method === 'HEAD') {
    if (isClickJs) {
      event.respondWith(fetch(new Request(targetURL, initOptions)).then(function (response) {
        return response.text().then(function (text) {
          return new Response('(function () { var top = window; ' + text + ' })()', {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        });
      }));
    } else {
      event.respondWith(fetch(new Request(targetURL, initOptions)));
    }
  } else {
    event.respondWith(request.arrayBuffer().then(function (body) {
      initOptions.body = body;
      return fetch(new Request(targetURL, initOptions));
    }));
  }
});
