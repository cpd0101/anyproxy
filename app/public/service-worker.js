this.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = request.url;
  var reg = /^https\:\/\/(www\.)?(anyproxy|proxyit)\.(cc|cn)/
  if (!reg.test(url)) {
    var targetRequest = new Request(location.origin + '/proxy?target=' + btoa(encodeURI(url)) + '&nocookie=true', {
      method: request.method,
      headers: request.headers,
      body: request.body
    });
    event.respondWith(fetch(targetRequest).then(function (res) {
      return res;
    }))
  }
});
