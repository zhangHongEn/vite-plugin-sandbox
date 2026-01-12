import {
  checkTransformScope,
  astTranform,
  checkSandBoxDistFile,
  astTranformSandBoxDistFile,
  getProxyWinVarName,
} from './utils';
import { createFilter } from '@rollup/pluginutils';

export interface SandboxOptions {
  appCode?: string;
  include?: any[];
  exclude?: any[];
  sandboxOptions?: {
    globalVarWhiteList?: string[];
    speedy?: boolean;
    disableScriptSandbox?: boolean;
  };
}

export default (options: SandboxOptions = {}) => {
  const appCode = options.appCode || 'app';
  const filter = createFilter(options.include || [], options.exclude || [/proxy-sandbox-browser/]);

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
          const proxyWin = getProxyWin('${appCode}', ${JSON.stringify(sandboxOptions)});
          export default proxyWin;
        `;
        return res;
      }
      return null;
    },
    async transform(source: string, id: string) {
      let code = source;
      const proxyWinVarName = getProxyWinVarName(appCode);
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
