'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    let name = 'AnyProxy';
    let logo = 'https://gw.alipayobjects.com/zos/rmsportal/vxuJMojdlMCwzDjREKzY.png';
    if (this.ctx.host.indexOf('proxyit.cc') > -1) {
      name = 'ProxyIt';
      logo = 'https://gw.alipayobjects.com/zos/rmsportal/ElfMNcmrhlPiYPrETnWI.png';
    }
    await this.ctx.render('index.nj', {
      name,
      logo,
      year: new Date().getFullYear(),
    });
  }
}

module.exports = HomeController;
