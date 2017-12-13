'use strict';

const Controller = require('egg').Controller;
const path = require('path');
const fs = require('fs');

class SsserverController extends Controller {
  async query() {
    const ctx = this.ctx;
    const content = await new Promise((resolve, reject) => {
      fs.readFile(path.join(process.cwd(), 'app', 'config', 'ss-config.json'), (err, data) => {
        if (err) {
          ctx.logger.error(err);
          reject('Not Found');
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
    this.ctx.assertCsrf();
    this.ctx.rotateCsrfSecret();
    this.ctx.body = {
      server_name: this.ctx.hostname,
      ...content,
      expire_date: 'one day',
    };
  }
}

module.exports = SsserverController;
