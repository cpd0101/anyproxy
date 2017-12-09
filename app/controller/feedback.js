'use strict';

const Controller = require('egg').Controller;
const getHostVar = require('../common/common').getHostVar;

class FeedbackController extends Controller {
  async index() {
    await this.ctx.render('feedback.nj', {
      ...getHostVar(this.ctx),
      year: new Date().getFullYear(),
    });
  }
}

module.exports = FeedbackController;
