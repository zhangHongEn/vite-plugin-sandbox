import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';

const traverse = _traverse.default;
const generate = _generate.default;

export function getProxyWinVarName(appCode) {
  return `__vite_sandbox_win__`;
  // return `__vite_sandbox_${appCode}__`;
}

/**
 * 检测是否需要转换
 * @param {*} pkg
 * @returns
 */
export function checkTransformScope(url, code) {
  const urlSplits = url.split('?');
  const uri = urlSplits[0];
  const query = urlSplits[1] || '';
  const ext = uri.split('.').pop();

  // if (
  //   url.indexOf('@chagee_vite-plugin-sandbox_dist_sandbox') !== -1 ||
  //   url.indexOf('vite-plugin-sandbox/dist/sandbox') !== -1
  // ) {
  //   return false;
  // }
  if (url.indexOf('chagee_mfe-sandbox') !== -1) {
    return false;
  }
  // if (code.indexOf(`var __commonJS`) !== -1) {
  //   return false;
  // }
  if (!['js', 'mjs', 'ts', 'vue', 'jsx', 'tsx'].includes(ext)) {
    return false;
  }
  if (uri.indexOf('node_modules/vite/dist') !== -1) {
    return false;
  }
  if (ext === 'vue' && query.indexOf('vue&type=style') === 0) {
    return false;
  }
  return true;
}

/**
 * 转换文件，主要是将window替换为${PROXY_WIN}.proxy
 * @param {*} code
 * @returns
 */
export function astTranform(code, proxyWinVarName) {
  const ast = parse(code, {
    sourceType: 'module',
  });

  traverse(ast, {
    ReferencedIdentifier(path) {
      if (!path.scope.getBinding(path.node.name)) {
        if (['arguments', 'process', proxyWinVarName].includes(path.node.name)) {
          return;
        }
        if (path.node.name === 'window') {
          path.node.name = `${proxyWinVarName}.proxy`;
        } else {
          path.node.name = `${proxyWinVarName}.proxy.${path.node.name}`;
        }
      }
    },
    // enter({node}) {
    //     if (node && node.type && node.type === 'CallExpression') {
    //         if (node.callee && node.callee.type && node.callee.type === 'MemberExpression') {
    //             if (node.callee.object && node.callee.object.type && node.callee.object.type === 'MemberExpression') {
    //              if (node.callee.object.object.name === 'document' &&
    //                 node.callee.object.property.name === 'body' &&
    //                 node.callee.property.name === 'appendChild') {
    //                     node.arguments.push({
    //                         type: 'StringLiteral',
    //                         value: proxyWinVarName, // 新增的参数内容
    //                         // raw: '"appCode"'
    //                       });
    //                 }
    //             }
    //         }
    //     }
    //   }
  });

  const output = generate(ast, {}, code);

  return output.code;
}

/**
 * 判断是否是sandbox dist文件
 * @param {*} url
 * @returns
 */
export function checkSandBoxDistFile(url) {
  if (url.indexOf('chagee_mfe-sandbox') !== -1) {
    return true;
  }
}

/**
 * 删除sandbox包里的Polyfill引用，避免循环引用问题
 * @param {*} code
 * @returns
 */
export function astTranformSandBoxDistFile(code) {
  const ast = parse(code, {
    sourceType: 'module',
  });

  traverse(ast, {
    ImportDeclaration: (path) => {
      path.remove();
    },
  });

  const output = generate(ast, {}, code);

  return output.code;
}
