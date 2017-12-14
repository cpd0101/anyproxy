'use strict';

module.exports = {
  getHostVar(ctx) {
    let name = 'AnyProxy';
    let logo = 'https://gw.alipayobjects.com/zos/rmsportal/MFrHApzagTDXZxzavQcR.png';
    let href = 'https://www.anyproxy.cc/';
    if (/proxyit\.(cc|cn)$/.test(ctx.hostname)) {
      name = 'ProxyIt';
      logo = 'https://gw.alipayobjects.com/zos/rmsportal/NVbtbCMOOQfxumVpmQNW.png';
      href = 'https://www.proxyit.cc/';
    }
    return { name, logo, href };
  },
};
