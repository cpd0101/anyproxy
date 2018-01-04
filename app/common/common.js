'use strict';

module.exports = {
  getHostVar(ctx) {
    const name = 'AnyProxy';
    const logo = 'https://gw.alipayobjects.com/zos/rmsportal/MFrHApzagTDXZxzavQcR.png';
    return { name, logo };
  },
  DOMAIN_WHITE_LIST: /^http(s)?\:\/\/([^\/]+\.)?(anyproxy|proxyit|baidu|zhihu|sohu|alipayobjects|bdstatic|gtimg|qq|itc|sohucs|taobao|tmall|tencent)\.(cc|cn|com|net|org|top)/i,
};
