'use strict';

module.exports = {
  getHostVar(ctx) {
    let name = 'AnyProxy';
    let logo = '/public/anyproxy.png';
    let href = 'https://www.anyproxy.cc/';
    if (/proxyit.cc$/.tets(ctx.hostname)) {
      name = 'ProxyIt';
      logo = '/public/proxyit.png';
      href = 'https://www.proxyit.cc/';
    }
    return { name, logo, href };
  },
};
