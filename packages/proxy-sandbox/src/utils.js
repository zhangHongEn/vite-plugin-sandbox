
const fnRegexCheckCacheMap = new WeakMap();
export function isConstructable(fn) {
  // 代码运行时原型方法可能会发生变化，因此我们需要每次都检查它
  const hasPrototypeMethods =
    fn.prototype &&
    fn.prototype.constructor === fn &&
    Object.getOwnPropertyNames(fn.prototype).length > 1;

  if (hasPrototypeMethods) return true;

  if (fnRegexCheckCacheMap.has(fn)) {
    return fnRegexCheckCacheMap.get(fn);
  }

  /*
    1. 有 prototype 并且 prototype 上有定义一系列非 constructor 属性
    2. 函数名大写开头
    3. class 函数
    满足其一则可认定为构造函数
   */
  let constructable = hasPrototypeMethods;
  if (!constructable) {
    // fn. toString 有很大的性能开销，如果 has 售卖方法检查未通过，我们会用正则表达式检查函数字符串
    const fnString = fn.toString();
    const constructableFunctionRegex = /^function\b\s[A-Z].*/;
    const classRegex = /^class\b/;
    constructable = constructableFunctionRegex.test(fnString) || classRegex.test(fnString);
  }

  fnRegexCheckCacheMap.set(fn, constructable);
  return constructable;
}

const callableFnCacheMap = new WeakMap();
export function isCallable(fn) {
  if (callableFnCacheMap.has(fn)) {
    return true;
  }

  /**
   * 我们不能使用 typeof 来确认它的功能，就像在某些 Safari 版本中一样
   * typeof document.all === 'undefined' // true
   * typeof document.all === 'function' // true
   */
  const callable = typeof fn === 'function' && fn instanceof Function;
  if (callable) {
    callableFnCacheMap.set(fn, callable);
  }
  return callable;
}

const frozenPropertyCacheMap = new WeakMap();
export function isPropertyFrozen(target, p) {
  if (!target || !p) {
    return false;
  }

  const targetPropertiesFromCache = frozenPropertyCacheMap.get(target) || {};

  if (targetPropertiesFromCache[p]) {
    return targetPropertiesFromCache[p];
  }

  const propertyDescriptor = Object.getOwnPropertyDescriptor(target, p);
  const frozen = Boolean(
    propertyDescriptor &&
      propertyDescriptor.configurable === false &&
      (propertyDescriptor.writable === false || (propertyDescriptor.get && !propertyDescriptor.set))
  );

  targetPropertiesFromCache[p] = frozen;
  frozenPropertyCacheMap.set(target, targetPropertiesFromCache);

  return frozen;
}


const boundedMap = new WeakMap();
export function isBoundedFunction(fn) {
  if (boundedMap.has(fn)) {
    return boundedMap.get(fn);
  }
  /*
   indexOf is faster than startsWith
   see https://jsperf.com/string-startswith/72
   */
  const bounded = fn.name.indexOf('bound ') === 0 && !fn.hasOwnProperty('prototype');
  boundedMap.set(fn, bounded);
  return bounded;
}

export const nativeGlobal = new Function('return this')();

export const nativeDocument = new Function('return document')();


/**
 * 函数将一个数组转换为一个对象:['a', 'b', 'c'] --> { a: true, b: true, c: true }
 * @param array
 */
export function array2TruthyObject(array) {
  return array.reduce(
    (acc, key) => {
      acc[key] = true;
      return acc;
    },
    Object.create(null),
  );
}


const functionBoundedValueMap = new WeakMap();
export function rebindTarget2Fn(target, fn) {
  /*
    仅绑定 isCallable && !isBoundedFunction && !isConstructable 的函数对象，如 window.console、window.atob 这类，不然微应用中调用时会抛出 Illegal invocation 异常
    目前没有完美的检测方式，这里通过 prototype 中是否还有可枚举的拓展方法的方式来判断
    @warning 这里不要随意替换成别的判断方式，因为可能触发一些 edge case（比如在 lodash.isFunction 在 iframe 上下文中可能由于调用了 top window 对象触发的安全异常）
   */
  if (isCallable(fn) && !isBoundedFunction(fn) && !isConstructable(fn)) {
    const cachedBoundFunction = functionBoundedValueMap.get(fn);
    if (cachedBoundFunction && cachedBoundFunction.target === target) {
      return cachedBoundFunction.value;
    }

    const boundValue = Function.prototype.bind.call(fn, target);

    // 有些可调用函数有自定义字段，我们需要将自己的道具复制到限值。比如矩函数。
    Object.getOwnPropertyNames(fn).forEach((key) => {
      // 边界值可能是一个代理，我们需要检查属性key是否存
      if (!boundValue.hasOwnProperty(key)) {
        Object.defineProperty(boundValue, key, Object.getOwnPropertyDescriptor(fn, key));
      }
    });

    // 如果绑定函数没有但目标函数有，则复制原型
    // 由于原型大部分是不可枚举的，我们需要手动从目标函数中复制它
    if (fn.hasOwnProperty('prototype') && !boundValue.hasOwnProperty('prototype')) {
      // 我们不应该使用赋值操作符来设置边界值原型，比如 “边界值。原型 = fn. 原型”
      // 因为赋值也会在没有原型属性的情况下查找原型链，
      // 当查找成功时，如果其描述符配置为可写 false 或仅具有 getter 访问器，则赋值将抛出 TypeError，例如 “Cannot 分配给只读属性” 原型 “函数”
      Object.defineProperty(boundValue, 'prototype', { value: fn.prototype, enumerable: false, writable: true });
    }

    // 一些 util，如 'function isNative（）{返回 typeof Ctor==='function'&& /nativecode/. test（Ctor.toString ()) } 依赖于原始的'toString（）'结果
    // 但是绑定函数总是会为 'toString' 返回 "function（）{[native code]}"，这是误导
    if (typeof fn.toString === 'function') {
      const valueHasInstanceToString = fn.hasOwnProperty('toString') && !boundValue.hasOwnProperty('toString');
      const boundValueHasPrototypeToString = boundValue.toString === Function.prototype.toString;

      if (valueHasInstanceToString || boundValueHasPrototypeToString) {
        const originToStringDescriptor = Object.getOwnPropertyDescriptor(
          valueHasInstanceToString ? fn : Function.prototype,
          'toString',
        );

        Object.defineProperty(
          boundValue,
          'toString',
          Object.assign(
            {},
            originToStringDescriptor,
            originToStringDescriptor?.get ? null : { value: () => fn.toString() },
          ),
        );
      }
    }

    functionBoundedValueMap.set(fn, {
      target,
      value: boundValue,
    });
    return boundValue;
  }

  return fn;
}
