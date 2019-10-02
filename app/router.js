'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  router.get('/', controller.home.index);
  router.get('/feedback', controller.feedback.index);
  router.post('/ss/getconfig', controller.ssserver.getconfig);
  router.get('/ss/getip', controller.ssserver.getip);
};
