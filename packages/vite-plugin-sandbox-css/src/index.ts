import { createFilter } from '@rollup/pluginutils';
import postcssPrefixSelector from 'postcss-prefix-selector';
import postcss from 'postcss';

export interface CssSandboxOptions {
  include?: any[];
  exclude?: any[];
  prefix?: string;
  overlaySelectors?: string[];
  defaultExcludeSelectors?: string[];
  excludeSelectors?: string[];
}

export default function cssSandbox(options: CssSandboxOptions = {}) {
  if (!options.prefix) {
    throw new Error('prefix is required');
  }
  const cssFilter = createFilter(options.include || [], options.exclude || []);
  const defaultExcludeSelectors = options.defaultExcludeSelectors || [':root', 'html', 'body'];

  const overlaySelectors = options.overlaySelectors || [];
  const excludeSelectors = defaultExcludeSelectors.concat(options.excludeSelectors || []);

  const prefix = `.${options.prefix}`;
  const postCssPlugin = postcssPrefixSelector({
    prefix,
    transform(prefix: string, selector: string, prefixedSelector: string) {
      if (excludeSelectors.some((rule) => selector.startsWith(rule))) {
        return selector;
      } else if (overlaySelectors.some((rule) => selector.startsWith(rule))) {
        return `${prefixedSelector}, ${prefix}${selector}`;
      }
      return prefixedSelector;
    },
  });

  const vitePluginSandboxPostcss = {
    name: 'vite-plugin-sandbox-css',
    async transform(code: string, id: string) {
      const isFilterCss = cssFilter(id);
      if (/\.css|\.scss|\.less$/.test(id) && isFilterCss) {
        const result = await postcss([postCssPlugin]).process(code);
        return {
          code: result.css,
          map: result.map,
        };
      }
      return null;
    },
  };

  return vitePluginSandboxPostcss;
}
