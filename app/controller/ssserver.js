'use strict';

const Controller = require('egg').Controller;
const path = require('path');
const fs = require('fs');

class SsserverController extends Controller {
  async query() {
    const ctx = this.ctx;
    let content = {};
    try {
      content = await new Promise((resolve, reject) => {
        fs.readFile(path.join(process.cwd(), 'app', 'config', 'ss-config.json'), (err, data) => {
          if (err) {
            ctx.logger.error(err);
            reject({ message: 'Not Found' });
            return;
          }
          let json = {};
          try {
            json = JSON.parse(data.toString());
          } catch (e) {
            json = {};
          }
          resolve(json);
        });
      });
    } catch (e) {
      ctx.body = { message: e.message };
      ctx.status = 404;
      return;
    }
    ctx.assertCsrf();
    ctx.rotateCsrfSecret();
    ctx.body = {
      server: '47.88.58.234',
      ...content,
      expiry_date: 'one day',
    };
  }

  async getip() {
    const ctx = this.ctx;
    const ip = ctx.query.ip || ctx.ip || '';
    const callback = ctx.query.callback || '';
    const result = await ctx.curl(`http://ip.chinaz.com/ajaxsync.aspx?at=ipbatch&ip=${ip}&callback=${callback}`);
    ctx.status = result.status;
    ctx.set(result.headers);
    ctx.set('content-type', 'application/x-javascript');
    ctx.body = result.data;
  }
}

module.exports = SsserverController;
