import { vitePluginSandboxCss } from './vite-plugin-sandbox-css';

describe('vitePluginSandboxCss', () => {
  it('should work', () => {
    expect(vitePluginSandboxCss()).toEqual('vite-plugin-sandbox-css');
  });
});
