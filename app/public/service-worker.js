this.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = request.url;
  var reg = /^http(s)?\:\/\/(.+\.)?(anyproxy|proxyit|baidu|zhihu|sohu|alipayobjects)\.(cc|cn|com|net)/i;
  if (reg.test(url)) {
    return;
  }
  var targetURL = location.origin + '/proxy?target=' + btoa(encodeURI(url)) + '&nocookie=true';
  var initOptions = {
    method: request.method,
    headers: request.headers
  };
  if (request.referrer) {
    if (request.referrer.indexOf(location.origin) === 0) {
      initOptions.referrer = request.referrer;
    } else {
      initOptions.referrer = location.origin + '/proxy?target=' + btoa(encodeURI(request.referrer)) + '&nocookie=true';
    }
  }
  var method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD') {
    event.respondWith(fetch(new Request(targetURL, initOptions)));
  } else {
    event.respondWith(request.arrayBuffer().then(function (body) {
      initOptions.body = body;
      return fetch(new Request(targetURL, initOptions));
    }));
  }
});
