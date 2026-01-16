import {
  checkTransformScope,
  astTranform,
  checkSandBoxDistFile,
  astTranformSandBoxDistFile,
  getProxyWinVarName,
} from './utils';
import { createFilter } from '@rollup/pluginutils';

export interface SandboxOptions {
  code?: string;
  include?: any[];
  exclude?: any[];
  sandboxOptions?: {
    globalVarWhiteList?: string[];
    speedy?: boolean;
    disableScriptSandbox?: boolean;
  };
}

export default (options: SandboxOptions = {}) => {
  const code = options.code || 'app';
  if (!code) {
    throw new Error('vite-plugin-sandbox: code is required');
  }
  const filter = createFilter(options.include || [], [/proxy-sandbox-browser/].concat(options.exclude || []));

  const sandboxOptions = options.sandboxOptions || {};

  const vitePluginSandbox = {
    name: 'vite-plugin-sandbox',
    enforce: 'post' as const,
    resolveId(id: string) {
      if (id.indexOf('proxy-sandbox-browser') !== -1 && id.indexOf('virtual=true') !== -1) {
        return id;
      }
      return null;
    },
    load(id: string) {
      if (id.indexOf('proxy-sandbox-browser') !== -1 && id.indexOf('virtual=true') !== -1) {
        const res = `
          import { getProxyWin } from 'proxy-sandbox-browser';
          const proxyWin = getProxyWin('${code}', ${JSON.stringify(sandboxOptions)});
          export default proxyWin;
        `;
        return res;
      }
      return null;
    },
    async transform(source: string, id: string) {
      let code = source;
      const proxyWinVarName = getProxyWinVarName(code);
      if (checkSandBoxDistFile(id)) {
        code = astTranformSandBoxDistFile(source);
      }
      if (checkTransformScope(id, source) && (await filter(id)) && id !== source) {
        try {
          code = astTranform(source, proxyWinVarName);
          code = `
            import ${proxyWinVarName} from 'proxy-sandbox-browser?virtual=true';
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

  return vitePluginSandbox;
};
