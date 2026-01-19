import ProxySandbox from './proxySandbox';
import { proxyObserve } from './overwrite';

const getProxyWin = (appCode, options) => {
  let ProxyWin = {
    proxy: window,
  };
  if (!window.__proxySandbox__) {
    window.__proxySandbox__ = {}
  }
  if (window.__proxySandbox__[appCode]) {
    ProxyWin = window.__proxySandbox__[appCode];
  } else {
    ProxyWin = new ProxySandbox(appCode, options);
    window.__proxySandbox__[appCode] = ProxyWin;
  }
  ProxyWin.active();
  
  // 修复window.MutationObserver监听body时报错
  proxyObserve();
  
  return ProxyWin;
};

export { getProxyWin };
