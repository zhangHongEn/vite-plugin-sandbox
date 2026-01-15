# vite-plugin-sandbox

通过代理，将`自由变量`与 `window`、`body`、`window.xxx` 引用单独隔离沙箱环境，适合微前端等场景。

## 安装

```bash
npm i vite-plugin-sandbox proxy-sandbox-browser -D
# 或
pnpm add vite-plugin-sandbox proxy-sandbox-browser -D
```

可以与 CSS 命名空间插件配合使用：`vite-plugin-sandbox-css`

## 快速开始

在 `vite.config.ts` 中启用：

```ts
import { defineConfig } from 'vite';
import sandbox from 'vite-plugin-sandbox';
import cssSandbox from 'vite-plugin-sandbox-css';

export default defineConfig({
  plugins: [
    sandbox({
      code: 'app1',
    }),
    cssSandbox({
      prefix: '.app1',
      overlaySelectors: ['.modal', '.popup'],
    }),
  ],
});
```

## 配置项

`sandbox(options: SandboxOptions)`
- `code`：应用标识, 用于区分不同模块。
- `include`/`exclude`：按 `@rollup/pluginutils` 的 `createFilter` 规则筛选要代理的模块路径。
- `sandboxOptions.globalVarWhiteList`：全局变量白名单，不被代理的全局变量，如 `window.xx` 引用。默认 `[]`
- `sandboxOptions.disableScriptSandbox`：是否禁用动态加载脚本代理，默认 `false`。

---

## English

### Overview
- A Vite plugin that isolates JS runtime by proxying global access and free identifiers into a sandboxed `window` provided by `proxy-sandbox-browser`. Designed for micro-frontend and multi-app rendering.

### Install
```bash
npm i vite-plugin-sandbox proxy-sandbox-browser -D
# or
pnpm add vite-plugin-sandbox proxy-sandbox-browser -D
```

### Quick Start
```ts
import { defineConfig } from 'vite';
import sandbox from 'vite-plugin-sandbox';
import cssSandbox from 'vite-plugin-sandbox-css';

export default defineConfig({
  plugins: [
    sandbox({
      code: 'app1',
    }),
    cssSandbox({
      prefix: '.app1',
      overlaySelectors: ['.modal', '.popup'],
    }),
  ],
});
```

### Options
- `code`: App identifier for distinguishing modules.
- `include`/`exclude`: Filter files to be transformed using `@rollup/pluginutils` `createFilter`.
- `sandboxOptions.globalVarWhiteList`: Global variables not to be proxied (e.g., specific `window.xx`).
- `sandboxOptions.disableScriptSandbox`: Disable script sandboxing for dynamically loaded scripts.
