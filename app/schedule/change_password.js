'use strict';

const path = require('path');
const fs = require('fs');

module.exports = {
  schedule: {
    cron: '0 4 * * *',
    type: 'worker',
  },
  async task(ctx) {
    const data = {
      server_port: 8686,
      password: Math.random().toString(36).substr(2),
      method: 'aes-256-cfb',
    };
    fs.writeFile(path.join(process.cwd(), 'app', 'config', 'ss-config.json'), JSON.stringify(data), err => {
      if (err) {
        ctx.logger.error(err);
        return;
      }
    });
  },
};
