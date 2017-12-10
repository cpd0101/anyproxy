this.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = request.url;
  var reg = /^http(s)?\:\/\/(.+\.)?(anyproxy|proxyit|baidu|sohu)\.(cc|cn|com)/
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
