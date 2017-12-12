this.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = request.url;
  var reg = /^http(s)?\:\/\/(.+\.)?(anyproxy|proxyit|baidu|sohu)\.(cc|cn|com)/i;
  if (!reg.test(url)) {
    var targetURL = location.origin + '/proxy?target=' + btoa(encodeURI(url)) + '&nocookie=true';
    var initOptions = {
      method: request.method,
      headers: request.headers,
      referrer: request.referrer
    };
    if (request.method.toUpperCase() === 'POST') {
      event.respondWith(request.arrayBuffer().then(function (body) {
        initOptions.body = body;
        return fetch(new Request(targetURL, initOptions));
      }))
    } else {
      event.respondWith(fetch(new Request(targetURL, initOptions)));
    }
  }
});
