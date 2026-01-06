import {
  checkTransformScope,
  astTranform,
  checkSandBoxDistFile,
  astTranformSandBoxDistFile,
  getProxyWinVarName,
} from './utils';
import { createFilter } from '@rollup/pluginutils';
import postcssPrefixSelector from 'postcss-prefix-selector';
import postcss from 'postcss';

export default (options) => {
  const { cssInclude = [], cssExclude = [] } = options;
  const appCode = options.appCode || 'app';
  const filter = createFilter(options.include || [], options.exclude || [/.*mfe-sandbox.*/]);
  const cssFilter = createFilter(cssInclude || [], cssExclude || []);

  // vue :deep postcss 处理插件
  const postcssOptions = options.postcssOptions || {};
  let include = postcssOptions.include || ['.el-', '#app'];
  let exclude = postcssOptions.exclude || [':root', 'html', 'body', '[data-vxe-ui-theme='];
  const sandboxOptions = options.sandboxOptions || {};

  if (postcssOptions.extendInclude) {
    include = include.concat(postcssOptions.extendInclude);
  }
  if (postcssOptions.extendExclude) {
    exclude = exclude.concat(postcssOptions.extendExclude);
  }
  const defaultPerfix = `.${appCode}`;
  const perfixOpt =
    (typeof options.perfix === 'function' ? options.perfix(defaultPerfix) : options.perfix) ||
    defaultPerfix;
  const postCssPlugin = postcssPrefixSelector({
    prefix: perfixOpt,
    transform(prefix, selector, prefixedSelector) {
      if (exclude.some((rule) => selector.startsWith(rule))) {
        // :root需要特殊处理，默认:root都在命名空间之下
        return selector;
      } else if (include.some((rule) => selector.startsWith(rule))) {
        // 标签元素，element插入body的元素，默认需要.appname .el-dialog, .appname.el-dialog打包成这种格式
        return `${prefixedSelector}, ${prefix}${selector}`;
      }
      return prefixedSelector;
    },
  });

  // js沙箱插件
  const vitePluginSandbox = {
    name: 'vite-plugin-js-sandbox',
    enforce: 'post',
    resolveId(id) {
      if (id.indexOf('@chagee/mfe-sandbox') !== -1 && id.indexOf('virtual=true') !== -1) {
        return id;
      }
      return null;
    },
    load(id) {
      if (id.indexOf('@chagee/mfe-sandbox') !== -1 && id.indexOf('virtual=true') !== -1) {
        const res = `
          import { getProxyWin } from '@chagee/mfe-sandbox';
          const proxyWin = getProxyWin('${appCode}', ${JSON.stringify(sandboxOptions)});
          export default proxyWin;
        `;
        return res;
      }
      return null;
    },
    async transform(source, id) {
      let code = source;
      const proxyWinVarName = getProxyWinVarName(appCode);
      if (checkSandBoxDistFile(id)) {
        code = astTranformSandBoxDistFile(source);
      }
      if (checkTransformScope(id, source) && (await filter(id)) && id !== source) {
        try {
          code = astTranform(source, proxyWinVarName);
          // const ${PROXY_WIN} = getProxyWin('${appCode}');
          code = `
            import ${proxyWinVarName} from '@chagee/mfe-sandbox?virtual=true';
            ${code};
          `;
        } catch (err) {
          console.error('vite-plugin-sandbox transform error: ', id, err);
        }
        return code;
      }

      return code;
    },
  };

  // css沙箱插件
  const vitePluginSandboxPostcss = {
    name: 'vite-plugin-css-sandbox',
    async transform(code, id) {
      const isFilterCss = await cssFilter(id)
      if (/\.css|\.scss|\.less$/.test(id) && isFilterCss) {
        // 处理 CSS 文件
        const result = await postcss([postCssPlugin]).process(code);
        return {
          code: result.css, // 返回处理后的 CSS
          map: result.map, // 返回 Source Map（可选）
        };
      }
    },
  };

  return [vitePluginSandbox, vitePluginSandboxPostcss];
};
