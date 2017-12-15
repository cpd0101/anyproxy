'use strict';

const Controller = require('egg').Controller;
const getHostVar = require('../common/common').getHostVar;
const DOMAIN_WHITE_LIST = require('../common/common').DOMAIN_WHITE_LIST;

class HomeController extends Controller {
  async index() {
    await this.ctx.render('index.nj', {
      ...getHostVar(this.ctx),
      year: new Date().getFullYear(),
      DOMAIN_WHITE_LIST: DOMAIN_WHITE_LIST.toString(),
    });
  }
}

module.exports = HomeController;
