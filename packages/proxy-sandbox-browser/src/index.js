import ProxySandbox from './proxySandbox';
import { setOverwrite } from './overwrite';

const getProxyWin = (appCode, options) => {
  let ProxyWin = {
    proxy: window,
  };
  if (window[`__proxy_win_${appCode}`]) {
    ProxyWin = window[`__proxy_win_${appCode}`];
  } else {
    ProxyWin = new ProxySandbox(appCode, options);
    window[`__proxy_win_${appCode}`] = ProxyWin;
  }
  ProxyWin.active();
  
  // 修复window.MutationObserver监听body时报错
  setOverwrite();
  
  return ProxyWin;
};

export { getProxyWin };
