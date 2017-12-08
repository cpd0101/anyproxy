'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    let name = 'AnyProxy';
    let logo = 'https://gw.alipayobjects.com/zos/rmsportal/vxuJMojdlMCwzDjREKzY.png';
    let href = 'http://www.anyproxy.cc/';
    if (this.ctx.host.indexOf('proxyit.cc') > -1) {
      name = 'ProxyIt';
      logo = 'https://gw.alipayobjects.com/zos/rmsportal/ElfMNcmrhlPiYPrETnWI.png';
      href = 'http://www.proxyit.cc/';
    }
    await this.ctx.render('index.nj', {
      name,
      logo,
      href,
      year: new Date().getFullYear(),
    });
  }
}

module.exports = HomeController;
