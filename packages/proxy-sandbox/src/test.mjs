const proxyWin5 = new Proxy(window, {
  get(target, prop) {
    // 对于其他属性，保持默认行为
    return Reflect.get(target, prop).bind(target);
  },
});
proxyWin5.alert(1);

const proxyDocument = new Proxy(document, {
  get(target, prop) {
    // 对于其他属性，保持默认行为
    return Reflect.get(target, prop, target);
  },
});
proxyDocument.body.appendChild(proxyDocument.createElement('div'));

const proxyWin4 = new Proxy(document, {
  get(docTarget, docProp) {
    return Reflect.get(docTarget, docProp);
  },
});
proxyWin4.body.appendChild(proxyWin4.createElement('div'));

/**
 * 基于 Proxy 实现的沙箱
 */
const proxyWin3 = new Proxy(window, {
  get(target, prop) {
    if (prop === 'document') {
      return new Proxy(window.document, {
        get(docTarget, docProp) {
          return Reflect.get(window.document, docProp);
        },
      });
    }
    return Reflect.get(target, prop);
  },
});
proxyWin3.document.body.appendChild(proxyWin3.document.createElement('div'));

/**
 * 基于 Proxy 实现的沙箱
 */

const proxyWin2 = new Proxy(window, {
  get(target, prop) {
    if (prop === 'document') {
      return new Proxy(target.document, {
        get(docTarget, docProp) {
          if (docProp === 'body') {
            return new Proxy(docTarget.body, {
              get(bodyTarget, bodyProp) {
                if (bodyProp === 'appendChild') {
                  return function (element) {
                    // 给元素添加当前沙箱的唯一标识符属性
                    console.log(8888888);
                    element.setAttribute('data-sandbox-id', 'xxx');
                    return bodyTarget.appendChild.call(bodyTarget, element);
                  };
                }
                return bodyTarget[bodyProp]; // 其他属性正常返回
              },
            });
          }
          return docTarget[docProp]; // 其他属性正常返回
        },
      });
    }
    return Reflect.get(target, prop);
  },
});
const div = proxyWin2.document.createElement('div');
// proxyWin2.document.body.appendChild(proxyWin2.document.createElement('div'))

class ProxySandbox {
  proxy;
  constructor(name) {
    const fakeWindow = {}; // 创建一个虚拟的全局对象

    this.proxy = new Proxy(window, {
      get: (target, prop) => {
        console.log(22222, prop);
        if (prop === 'document') {
          return new Proxy(target.document, {
            get(docTarget, docProp) {
              if (docProp === 'body') {
                return new Proxy(docTarget.body, {
                  get(bodyTarget, bodyProp) {
                    if (bodyProp === 'appendChild') {
                      return function (element) {
                        // 给元素添加当前沙箱的唯一标识符属性
                        console.log(8888888);
                        element.setAttribute('data-sandbox-id', 'xxx');
                        return bodyTarget.appendChild.call(bodyTarget, element);
                      };
                    }
                    return bodyTarget[bodyProp]; // 其他属性正常返回
                  },
                });
              }
              return docTarget[docProp]; // 其他属性正常返回
            },
          });
        }
        return Reflect.get(window, prop);
      },
    });
  }
}

const proxyWin = new ProxySandbox('app1');
proxyWin.proxy.document.body.appendChild(document.createElement('div'));

const getProxyWin = (appName) => {
  let ProxyWin = {
    proxy: window,
  };
  if (window[`__proxy_win_${appName}`]) {
    ProxyWin = window[`__proxy_win_${appName}`];
  } else {
    ProxyWin = new ProxySandbox(appName);
    window[`__proxy_win_${appName}`] = ProxyWin;
  }
  ProxyWin.active();
  return ProxyWin;
};

export { getProxyWin };
