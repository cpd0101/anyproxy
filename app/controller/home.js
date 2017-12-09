'use strict';

const Controller = require('egg').Controller;
const getHostVar = require('../common/common').getHostVar;

class HomeController extends Controller {
  async index() {
    await this.ctx.render('index.nj', {
      ...getHostVar(this.ctx),
      year: new Date().getFullYear(),
    });
  }
}

module.exports = HomeController;
