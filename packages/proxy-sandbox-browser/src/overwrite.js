export const proxyObserve = function () {
  if (window.__mfe_overwrite__) return;
  window.__mfe_overwrite__ = true;

  // 封装重写方法的通用逻辑
  const rewriteMethod = (prototype, methodName) => {
    // 检查原型对象是否存在以及方法是否存在
    if (!prototype || !prototype[methodName]) {
      console.warn(`mfe-sandbox：无法重写方法 ${methodName}，原型对象或方法不存在`);
      return;
    }
    const originalMethod = prototype[methodName];
    prototype[methodName] = function (target, ...args) {
      if (target && target.__origin_el) {
        target = target.__origin_el;
      }
      // 确保原始方法存在再调用
      if (typeof originalMethod === 'function') {
        return originalMethod.call(this, target, ...args);
      }
      console.warn(`原始方法 ${methodName} 不是一个函数`);
    };
  };

  // fix window.MutationObserver监听body时报错，仅重写observe方法
  rewriteMethod(window.MutationObserver.prototype, 'observe');
  // fix window.IntersectionObserver监听节点时报错
  rewriteMethod(window.IntersectionObserver.prototype, 'observe');
  rewriteMethod(window.IntersectionObserver.prototype, 'unobserve');
  // fix window.ResizeObserver监听节点时报错
  rewriteMethod(window.ResizeObserver.prototype, 'observe');
  rewriteMethod(window.ResizeObserver.prototype, 'unobserve');
};
