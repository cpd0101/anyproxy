'use strict';

module.exports = {
  getHostVar(ctx) {
    let name = 'AnyProxy';
    let logo = '/public/anyproxy.png';
    let href = `${ctx.protocol}://www.anyproxy.cc/`;
    if (ctx.host.indexOf('proxyit.cc') > -1) {
      name = 'ProxyIt';
      logo = '/public/proxyit.png';
      href = `${ctx.protocol}://www.proxyit.cc/`;
    }
    return { name, logo, href };
  },
}
