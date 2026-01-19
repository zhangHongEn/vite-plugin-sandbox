# vite-plugin-sandbox

![npm package](https://img.shields.io/npm/v/vite-plugin-sandbox.svg)

[简体中文](#简体中文) | [English](#english)

## 简体中文

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
      overlaySelectors: ['.modal', '.popup', '.el-', '.ant-'],
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

- 顶层自由变量：凡未在当前作用域声明的标识符（如 `document`、`console`、`Date`、`setTimeout` 等），会被重写为 `__vite_sandbox_win__.proxy.<标识符>`。
- `window`：会被重写为 `__vite_sandbox_win__.proxy`，因此 `window.xxx` 等价于 `__vite_sandbox_win__.proxy.xxx`，所有属性访问与方法调用均在沙箱环境内完成。
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


---

## English

### Overview
- Isolates free variables and references to `window`, `document.body`, and `window.xxx` into a proxy-based sandbox environment, suitable for micro-frontends.

### Install
```bash
npm i vite-plugin-sandbox proxy-sandbox-browser -D
# or
pnpm add vite-plugin-sandbox proxy-sandbox-browser -D
```

Can be used together with the CSS namespace plugin: `vite-plugin-sandbox-css`.

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
      overlaySelectors: ['.modal', '.popup', '.el-', '.ant-'],
    }),
  ],
});
```

### Options
- `code`: App identifier used to distinguish modules.
- `include`/`exclude`: Filter paths to be proxied using `@rollup/pluginutils` `createFilter`.
- `sandboxOptions.globalVarWhiteList`: Global variables not proxied (e.g. specific `window.xx`). Default `[]`.
- `sandboxOptions.disableScriptSandbox`: Whether to disable proxying for dynamically loaded scripts. Default `false`.

### Variable Proxy & Effects
- Free variables: Any identifier not declared in local scope (e.g. `document`, `console`, `Date`, `setTimeout`) is rewritten to `__vite_sandbox_win__.proxy.<identifier>` and read from the proxy window.
- `window`: Rewritten to `__vite_sandbox_win__.proxy`, hence `window.xxx` becomes `__vite_sandbox_win__.proxy.xxx` and runs inside the sandbox.
- `window.xxx`: e.g. `window.alert`, `window.fetch`, `window.localStorage` are rewritten to proxy counterparts; isolation and whitelisting are controlled by runtime (`sandboxOptions.globalVarWhiteList`).

Example (key lines before/after):
```ts
// original
document.title = 'Hello';
window.alert('hi');
console.log(Date.now());

// rewritten (simplified)
import __vite_sandbox_win__ from 'proxy-sandbox-browser?virtual=true';
__vite_sandbox_win__.proxy.document.title = 'Hello';
__vite_sandbox_win__.proxy.alert('hi');
__vite_sandbox_win__.proxy.console.log(__vite_sandbox_win__.proxy.Date.now());
```

<a id="english"></a>
