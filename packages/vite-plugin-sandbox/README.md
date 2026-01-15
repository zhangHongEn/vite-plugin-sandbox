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

## 变量代理与效果

- 顶层自由变量：凡未在当前作用域声明的标识符（如 `document`、`console`、`Date`、`setTimeout` 等），会被重写为 `__vite_sandbox_win__.proxy.<标识符>`，统一从代理 `window` 读取。
- `window`：会被重写为 `__vite_sandbox_win__.proxy`，因此 `window.xxx` 等价于 `__vite_sandbox_win__.proxy.xxx`，所有属性访问与方法调用均在沙箱环境内完成。
- `document.body`：由于 `document` 属于自由变量，`document.body` 会变为 `__vite_sandbox_win__.proxy.document.body`，DOM 操作由运行时代理控制其作用域与影响范围。
- `window.xxx`：如 `window.alert`、`window.fetch`、`window.localStorage` 会重写为 `__vite_sandbox_win__.proxy.alert/fetch/localStorage`，由运行时决定具体隔离与白名单行为（可通过 `sandboxOptions.globalVarWhiteList` 配置例外）。

示例（代码改写前后对比，仅展示关键行）：

```ts
// 原始代码
document.title = 'Hello';
window.alert('hi');
console.log(Date.now());

// 重写后（简化展开）
import __vite_sandbox_win__ from 'proxy-sandbox-browser?virtual=true';
__vite_sandbox_win__.proxy.document.title = 'Hello';
__vite_sandbox_win__.proxy.alert('hi');
__vite_sandbox_win__.proxy.console.log(__vite_sandbox_win__.proxy.Date.now());
```

说明：
- 以上重写由 AST 在构建期完成（`packages/vite-plugin-sandbox/src/utils.ts:53-69`），运行时的实际隔离行为由 `proxy-sandbox-browser` 决定。
- 可使用 `sandboxOptions.globalVarWhiteList` 将特定的 `window.xx` 排除在代理之外。

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
