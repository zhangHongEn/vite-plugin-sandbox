# vite-plugin-sandbox-monorepo

一个包含 JS 运行时隔离与 CSS 命名空间插件的 Monorepo，用于在 Vite 项目中实现微前端样式/变量隔离。

## 包
- `vite-plugin-sandbox`：JS 沙箱插件，通过虚拟模块注入 `proxy-sandbox-browser`，将自由变量与 `window` 引用重写到代理窗口。
- `vite-plugin-sandbox-css`：CSS 命名空间插件，为样式选择器自动添加命名空间前缀，并支持 Overlay/Portal 等插入根元素的组件。

## 安装

在业务项目中使用时：

```bash
pnpm add vite-plugin-sandbox vite-plugin-sandbox-css proxy-sandbox-browser -D
# 或
npm i vite-plugin-sandbox vite-plugin-sandbox-css proxy-sandbox-browser -D
```

## 快速开始

在 `vite.config.ts` 中启用两个插件：

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

- `vite-plugin-sandbox`：[详细配置](packages/vite-plugin-sandbox/README.md)
- `vite-plugin-sandbox-css`：[详细配置](packages/vite-plugin-sandbox-css/README.md)

---

## English

### Overview
- A monorepo containing a JS runtime isolation plugin and a CSS namespace plugin for Vite projects, suitable for micro-frontend style and global isolation.

### Packages
- `vite-plugin-sandbox`: JS sandbox that injects `proxy-sandbox-browser` and rewrites free identifiers and `window` references to a proxy window.
- `vite-plugin-sandbox-css`: CSS namespace plugin that adds `.<namespace>` to selectors and supports dual-prefix forms for overlays/portals.

### Install
```bash
pnpm add vite-plugin-sandbox vite-plugin-sandbox-css proxy-sandbox-browser -D
# or
npm i vite-plugin-sandbox vite-plugin-sandbox-css proxy-sandbox-browser -D
```

### Quick Start
```ts
import { defineConfig } from 'vite';
import sandbox from 'vite-plugin-sandbox';
import cssSandbox from 'vite-plugin-sandbox-css';

export default defineConfig({
  plugins: [
    sandbox({ code: 'app1' }),
    cssSandbox({
      prefix: '.app1',
      overlaySelectors: ['.modal', '.popup'],
    }),
  ],
});
```

### Docs
- `vite-plugin-sandbox`: see `packages/vite-plugin-sandbox/README.md`
- `vite-plugin-sandbox-css`: see `packages/vite-plugin-sandbox-css/README.md`
