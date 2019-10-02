'use strict';

module.exports = {
  getHostVar() {
    const name = '在线网页代理';
    const logo = 'https://gw.alipayobjects.com/zos/rmsportal/MFrHApzagTDXZxzavQcR.png';
    return { name, logo };
  },
  DOMAIN_WHITE_LIST: /^http(s)?\:\/\/([^\/]+\.)?(anyproxy|proxyit|baidu|zhihu|sohu|alipayobjects|bdstatic|gtimg|qq|itc|sohucs|taobao|tmall|tencent|checkdomain)\.(cc|cn|com|net|org|top|de)/i,
};
