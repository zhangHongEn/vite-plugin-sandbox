import { without, isFunction } from 'lodash';
import { isPropertyFrozen, nativeGlobal, rebindTarget2Fn, array2TruthyObject } from './utils';
import { globalsInBrowser, globalsInES2015 } from './globals';
import { execScripts } from 'import-html-entry';

// 浏览器全局属性
const cachedGlobalsInBrowser = array2TruthyObject(
  globalsInBrowser.concat(process.env.NODE_ENV === 'test' ? ['mockNativeWindowFunction'] : [])
);

// 判断一个属性是不是浏览器全局属性
function isNativeGlobalProp(prop) {
  return prop in cachedGlobalsInBrowser;
}

// 缓存原生的Object.defineProperty
const rawObjectDefineProperty = Object.defineProperty;

// 不受沙箱限制的开发环境全局变量白名单
const variableWhiteListInDev =
  process.env.NODE_ENV === 'test' ||
  process.env.NODE_ENV === 'development' ||
  window.__MFE_DEVELOPMENT__
    ? [
        // for react hot reload
        '__REACT_ERROR_OVERLAY_GLOBAL_HOOK__',
        // for react development event
        'event',
      ]
    : [];
// 不受沙箱限制的全局变量白名单
const globalVariableWhiteList = [
  // FIXME System. js 使用了与 eval 的间接调用，这将使其范围转义到全局
  // 为了使 System. js 运行良好，我们将其临时写回全局窗口
  'System',
  '__cjsWrapper',
  /^jsonp_.*/,
  // fix vue 热更新
  '__VUE_HMR_RUNTIME__',
  ...variableWhiteListInDev,
];

// 定义了一些在每次访问时都应该被记录的全局变量名称
const accessingSpiedGlobals = ['document', 'top', 'parent', 'eval'];
const overwrittenGlobals = ['window', 'self', 'globalThis', 'hasOwnProperty'];
export const cachedGlobals = Array.from(
  new Set(
    without(
      globalsInES2015.concat(overwrittenGlobals).concat('requestAnimationFrame'),
      ...accessingSpiedGlobals
    )
  )
);

const cachedGlobalObjects = array2TruthyObject(cachedGlobals);

/*
由于性能原因，无法覆盖的变量需要从代理沙盒中转义。
但是不能转义被覆盖的全局变量，否则它们将被泄露到全局范围。
 */
const unscopables = array2TruthyObject(
  without(cachedGlobals, ...accessingSpiedGlobals.concat(overwrittenGlobals))
);

const useNativeWindowForBindingsProps = new Map([
  ['fetch', true],
  ['mockDomAPIInBlackList', process.env.NODE_ENV === 'test'],
]);

// 创建一个模拟的窗口对象 fakeWindow，并复制主应用窗口对象中不可配置的属性到 fakeWindow
// 处理一些特殊的属性，如 top、parent、self、window、document 等，使其在沙箱环境中可配置和可写。
// 返回包含 fakeWindow 和记录有 getter 属性的 propertiesWithGetter 的对象
function createFakeWindow(globalContext = window, speedy) {
  // map always has the fastest performance in has checked scenario
  // see https://jsperf.com/array-indexof-vs-set-has/23
  // 跟踪具有 getter（访问器属性的获取函数）的属性
  const propertiesWithGetter = new Map();
  const fakeWindow = {};

  /*
   将 global 的不可配置属性复制到 fakeWindow,如果属性不作为目标对象的自身属性存在，或者如果它作为目标对象的可配置自身属性存在，则不能将属性报告为不可配置。
   */
  Object.getOwnPropertyNames(globalContext)
    .filter((p) => {
      const descriptor = Object.getOwnPropertyDescriptor(globalContext, p);
      return !descriptor?.configurable;
    })
    .forEach((p) => {
      const descriptor = Object.getOwnPropertyDescriptor(globalContext, p);
      if (descriptor) {
        const hasGetter = Object.prototype.hasOwnProperty.call(descriptor, 'get');

        /*
         使 top/self/windows 属性可配置和可写，否则在获取陷阱返回时会导致 TypeError。如果目标对象属性是不可写、不可配置的数据属性，则为属性报告的值必须与相应目标对象属性的值相同。
         */
        if (
          p === 'top' ||
          p === 'parent' ||
          p === 'self' ||
          p === 'window' ||
          // window.document is overwriting in speedy mode
          (p === 'document' && speedy)
        ) {
          descriptor.configurable = true;
          /*
           Safari/FF 中 windows. windows/window.top/window.self 的描述符是访问描述符，我们需要避免添加数据描述符
           Example:
            Safari/FF: Object.getOwnPropertyDescriptor(window, 'top') -> {get: function, set: undefined, enumerable: true, configurable: false}
            Chrome: Object.getOwnPropertyDescriptor(window, 'top') -> {value: Window, writable: false, enumerable: true, configurable: false}
           */
          if (!hasGetter) {
            descriptor.writable = true;
          }
        }

        if (hasGetter) propertiesWithGetter.set(p, true);

        // 冻结描述符以避免被 zone. js 修改
        rawObjectDefineProperty(fakeWindow, p, Object.freeze(descriptor));
      }
    });

  return {
    fakeWindow,
    propertiesWithGetter,
  };
}

let activeSandboxCount = 0;

function patchCustomEvent(e,elementGetter) {
  Object.defineProperties(e, {
    srcElement: {
      get: elementGetter,
    },
    target: {
      get: elementGetter,
    },
  });

  return e;
}

function manualInvokeElementOnLoad(element) {
  const loadEvent = new CustomEvent('load');
  const patchedEvent = patchCustomEvent(loadEvent, () => element);
  if (isFunction(element.onload)) {
    element.onload(patchedEvent);
  } else {
    element.dispatchEvent(patchedEvent);
  }
}
function manualInvokeElementOnError(element) {
  const errorEvent = new CustomEvent('error');
  const patchedEvent = patchCustomEvent(errorEvent, () => element);
  if (isFunction(element.onerror)) {
    element.onerror(patchedEvent);
  } else {
    element.dispatchEvent(patchedEvent);
  }
}
const execScriptsWithSandbox = (args, rawFn, mountDOM, proxy) => {
  let element = args[0];
  const { src, text } = element;
  const strictGlobal = true;
  const scopedGlobalVariables = [];

  if (src) {
    let isRedfinedCurrentScript = false;
    execScripts(null, [src], proxy.proxy, {
      // fetch,
      strictGlobal,
      scopedGlobalVariables,
      beforeExec: () => {
        const isCurrentScriptConfigurable = () => {
          const descriptor = Object.getOwnPropertyDescriptor(document, 'currentScript');
          return !descriptor || descriptor.configurable;
        };
        if (isCurrentScriptConfigurable()) {
          Object.defineProperty(document, 'currentScript', {
            get() {
              return element;
            },
            configurable: true,
          });
          isRedfinedCurrentScript = true;
        }
      },
      success: () => {
        manualInvokeElementOnLoad(element);
        if (isRedfinedCurrentScript) {
          // @ts-ignore
          delete document.currentScript;
        }
        element = null;
      },
      error: () => {
        manualInvokeElementOnError(element);
        if (isRedfinedCurrentScript) {
          // @ts-ignore
          delete document.currentScript;
        }
        element = null;
      },
    });

    const dynamicScriptCommentElement = document.createComment(`dynamic script ${src} replaced by sandbox`);
    return rawFn.call(mountDOM, dynamicScriptCommentElement);
  }

  // inline script never trigger the onload and onerror event
  execScripts(null, [`<script>${text}</script>`], proxy, { strictGlobal, scopedGlobalVariables });
  const dynamicInlineScriptCommentElement = document.createComment('dynamic inline script replaced by sandbox');
  return rawFn.call(mountDOM, dynamicInlineScriptCommentElement);

};

/**
 * 基于 Proxy 实现的沙箱
 */
export default class ProxySandbox {
  /** window 值变更记录 */
  updatedValueSet = new Set();
  document = document;
  code;
  type;
  proxy;
  sandboxRunning = true;
  latestSetProp = null;

  // 激活沙箱
  active() {
    if (!this.sandboxRunning) {
      activeSandboxCount++;
    }
    this.sandboxRunning = true;
  }

  // 释放沙箱
  inactive() {
    if (--activeSandboxCount === 0) {
      // reset the global value to the prev value
      Object.keys(this.globalWhitelistPrevDescriptor).forEach((p) => {
        const descriptor = this.globalWhitelistPrevDescriptor[p];
        if (descriptor) {
          Object.defineProperty(this.globalContext, p, descriptor);
        } else {
          delete this.globalContext[p];
        }
      });
    }

    this.sandboxRunning = false;
  }

  patchDocument(doc) {
    this.document = doc;
  }

  // 修改前白名单中全局变量的描述符
  globalWhitelistPrevDescriptor = {};
  globalContext;

  constructor(code, opts = {}) {
    this.code = code;
    this.globalContext = opts.globalContext || window;

    const { updatedValueSet, globalContext } = this;
    const { speedy } = opts;
    const self = this;

    const { fakeWindow, propertiesWithGetter } = createFakeWindow(globalContext, !!speedy);

    const descriptorTargetMap = new Map();

    // 不受沙箱限制的全局变量白名单
    const globalVarWhiteList = globalVariableWhiteList.concat(opts.globalVarWhiteList || []);
    const checkGlobalVarWhiteList = (p) => {
      if (typeof p === 'string') {
        if ( globalVarWhiteList.indexOf(p) !== -1) {
          return true;
        }
        // 如果globalVarWhiteList里的正则匹配到p，返回true
        return globalVarWhiteList.some((reg) => {
          if (reg instanceof RegExp) {
            return reg.test(p);
          }
          return false;
        });
      }
    }

    // 代理对象缓存
    const proxyCache = new WeakMap();

    this.document = new Proxy(globalContext.document, {
      get(docTarget, docProp) {
        if (docProp === 'querySelector') {
          return function (...args) {
            if (args[0] === 'body') {
              return self.document.body;
            }
            return rebindTarget2Fn(docTarget, docTarget[docProp])(...args);
          };
        }
        if (docProp === 'body') {
          if (!proxyCache.has(docTarget.body)) {
            const bodyProxy = new Proxy(docTarget.body, {
              get(bodyTarget, bodyProp) {
                if (['replaceChild', 'insertBefore', 'appendChild'].includes(bodyProp)) {
                  return function (...args) {
                    if (args[0] && args[0].tagName === 'SCRIPT' && !opts.disableScriptSandbox) {
                      return execScriptsWithSandbox(args, bodyTarget[bodyProp], bodyTarget, self)
                    } else if (args[0] && args[0].classList) {
                      args[0].classList.add(self.code);
                    }
                    return bodyTarget[bodyProp].apply(bodyTarget, args);
                  };
                }
                return rebindTarget2Fn(bodyTarget, bodyTarget[bodyProp]);
              },
              set(target, p, value) {
                target[p] = value;
                return true;
              },
            });
            bodyProxy.__origin_el = docTarget.body;
            proxyCache.set(docTarget.body, bodyProxy);
          }
          return proxyCache.get(docTarget.body);
        }
        if (docProp === 'defaultView') {
          return new Proxy(docTarget[docProp], {
            get(actualTarget, p) {
              const value = actualTarget[p];
              if (p === 'addEventListener') {
                return function (...args) {
                  if (typeof args[1] === 'function') {
                    args[1].__mfe_app_code = self.code;
                  }
                  return rebindTarget2Fn(actualTarget, value)(...args);
                };
              }
              return rebindTarget2Fn(actualTarget, value);
            }
          });
        }
        return rebindTarget2Fn(docTarget, docTarget[docProp]);
      },
      set(target, p, value) {
        target[p] = value;
        return true;
      },
    });

    const proxy = new Proxy(fakeWindow, {
      set: (target, p, value) => {
        if (this.sandboxRunning) {
          // 白名单的属性可以设置到window上
          if (checkGlobalVarWhiteList(p)) {
            this.globalWhitelistPrevDescriptor[p] = Object.getOwnPropertyDescriptor(
              globalContext,
              p
            );
            globalContext[p] = value;
          } else {
            // 如果属性不在fakeWindow上，但是在window上，尝试设置一个在全局上下文中存在但在代理目标对象中不存在的属性。
            if (!target.hasOwnProperty(p) && globalContext.hasOwnProperty(p)) {
              const descriptor = Object.getOwnPropertyDescriptor(globalContext, p);
              const { writable, configurable, enumerable, set } = descriptor;
              if (writable || set) {
                Object.defineProperty(target, p, {
                  configurable,
                  enumerable,
                  writable: true,
                  value,
                });
              }
            } else {
              target[p] = value;
            }
          }

          updatedValueSet.add(p);

          this.latestSetProp = p;

          return true;
        }

        // 在 strict-mode 下，Proxy 的 handler.set 返回 false 会抛出 TypeError，在沙箱卸载的情况下应该忽略错误
        return true;
      },

      get: (target, p) => {
        // 设置为当前正在运行的子应用

        if (p === Symbol.unscopables) return unscopables;
        // avoid who using window.window or window.self to escape the sandbox environment to touch the real window
        if (p === 'window' || p === 'self') {
          return proxy;
        }

        // hijack globalWindow accessing with globalThis keyword
        if (p === 'globalThis') {
          return proxy;
        }

        if (p === 'top' || p === 'parent') {
          // if your master app in an iframe context, allow these props escape the sandbox
          if (globalContext === globalContext.parent) {
            return proxy;
          }
          return globalContext[p];
        }

        // proxy.hasOwnProperty would invoke getter firstly, then its value represented as globalContext.hasOwnProperty
        if (p === 'hasOwnProperty') {
          return hasOwnProperty;
        }

        if (p === 'document') {
          return this.document;
        }

        if (p === 'eval') {
          return eval;
        }

        // 如果是白名单里的属性，直接返回window里的同名属性
        if (checkGlobalVarWhiteList(p)) {
          // @ts-ignore
          return globalContext[p];
        }

        // 取特定属性，如果属性具有 getter，说明是原生对象的那几个属性，否则是 fakeWindow 对象上的属性（原生的或者用户设置的)
        const actualTarget = propertiesWithGetter.has(p)
          ? globalContext
          : p in target
          ? target
          : globalContext;
        const value = actualTarget[p];

        // 如果是冻结属性，直接返回值
        if (isPropertyFrozen(actualTarget, p)) {
          return value;
        }

        // js 原生对象， 比如Object,Object
        if (!isNativeGlobalProp(p) && !useNativeWindowForBindingsProps.has(p)) {
          return value;
        }

        /* 一些 dom api 必须绑定到本机窗口，否则会导致异常，例如 “TypeError： Fail to 执行” 在 “Window” 上的 “fetch”：非法调用”
           See this code:
             const proxy = new Proxy(window, {});
             // in nest sandbox fetch will be bind to proxy rather than window in master
             const proxyFetch = fetch.bind(proxy);
             proxyFetch('https://xxx.com');
        */
        // window BOM 原生属性，比如location，localStorage，HTMLElement, setTimeout
        const boundTarget = useNativeWindowForBindingsProps.get(p) ? nativeGlobal : globalContext;

        // support vue-router 隔离
        if (p === 'addEventListener') {
          return function (...args) {
            if (typeof args[1] === 'function') {
              args[1].__mfe_app_code = self.code;
            }
            return rebindTarget2Fn(boundTarget, value)(...args);
          };
        }

        // fix window.getComputedStyle方法只接受原生element对象
        if (p === 'getComputedStyle') {
          return function (...args) {
            if (args[0].__origin_el) {
              args[0] = args[0].__origin_el;
            }
            return rebindTarget2Fn(boundTarget, value)(...args);
          };
        }

        return rebindTarget2Fn(boundTarget, value);
      },

      // trap in operator
      has(target, p) {
        // cachedGlobalObjects 中的属性必须返回 true 以避免从 get 中逃逸
        return p in cachedGlobalObjects || p in target || p in globalContext;
      },

      getOwnPropertyDescriptor(target, p) {
        /*
         由于原始窗口中 top/self/windows/mockTop 的描述符是可配置的，但在代理目标中不是，我们需要从目标中获取它以避免 TypeError；
         如果属性不作为目标对象的自身属性存在，或者如果它作为目标对象的可配置自身属性存在，则不能将属性报告为不可配置。
         */
        if (target.hasOwnProperty(p)) {
          const descriptor = Object.getOwnPropertyDescriptor(target, p);
          descriptorTargetMap.set(p, 'target');
          return descriptor;
        }

        if (globalContext.hasOwnProperty(p)) {
          const descriptor = Object.getOwnPropertyDescriptor(globalContext, p);
          descriptorTargetMap.set(p, 'globalContext');
          // 如果属性不作为目标对象的自身属性存在，则不能将其报告为不可配置
          if (descriptor && !descriptor.configurable) {
            descriptor.configurable = true;
          }
          return descriptor;
        }

        return undefined;
      },

      // trap to support iterator with sandbox
      ownKeys(target) {
        return Array.from(new Set(Reflect.ownKeys(globalContext).concat(Reflect.ownKeys(target))));
      },

      defineProperty: (target, p, attributes) => {
        const from = descriptorTargetMap.get(p);
        /*
         描述符必须定义为本机窗口，而它来自本机窗口通过对象。getOwnPropertyDescriptor（window，p），否则会导致非法调用的 TypeError。
         */
        switch (from) {
          case 'globalContext':
            return Reflect.defineProperty(globalContext, p, attributes);
          default:
            return Reflect.defineProperty(target, p, attributes);
        }
      },

      deleteProperty: (target, p) => {
        if (target.hasOwnProperty(p)) {
          // @ts-ignore
          delete target[p];
          updatedValueSet.delete(p);

          return true;
        }

        return true;
      },

      // makes sure `window instanceof Window` returns truthy in micro app
      getPrototypeOf() {
        return Reflect.getPrototypeOf(globalContext);
      },
    });

    this.proxy = proxy;

    activeSandboxCount++;

    function hasOwnProperty(target, key) {
      // calling from hasOwnProperty.call(obj, key)
      if (target !== proxy && target !== null && typeof target === 'object') {
        return Object.prototype.hasOwnProperty.call(target, key);
      }

      return fakeWindow.hasOwnProperty(key) || globalContext.hasOwnProperty(key);
    }
  }
}
