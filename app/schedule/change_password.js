'use strict';

const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

module.exports = {
  schedule: {
    interval: '1h',
    type: 'worker',
  },
  async task(ctx) {
    const data = {
      server_port: (Math.random() * 0.1 + 0.8).toString(10).substr(2, 4),
      password: Math.random().toString(36).substr(2),
      method: 'aes-256-cfb',
    };
    const filePath = path.join(process.cwd(), 'app', 'config', 'ss-config.json');
    fs.writeFile(filePath, JSON.stringify(data), err => {
      if (err) {
        ctx.logger.error(err);
        return;
      }
      exec(`ssserver -c ${filePath} -d restart`, err => {
        if (err) {
          ctx.logger.error(err);
          return;
        }
      });
    });
  },
};
