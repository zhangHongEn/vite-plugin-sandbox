# vite-plugin-sandbox-css

为样式选择器添加应用命名空间前缀的 Vite 插件。支持针对会插入到 `body` 的组件（如 Modal/Overlay）生成两种前缀形式，以保证隔离与可控覆盖。

## 特性
- 命名空间前缀：统一将选择器前缀化为 `.<namespace> <selector>`。
- Overlay/Portal 特性：对指定选择器生成双形式前缀：`.<namespace> <selector>, .<namespace><selector>`
- 可配置排除：默认排除 `:root/html/body` 等选择器，支持追加

## 安装

```bash
npm i vite-plugin-sandbox-css -D
# 或
pnpm add vite-plugin-sandbox-css -D
```

通常与 `vite-plugin-sandbox` 联合使用实现 JS 与 CSS 的双重隔离。

## 快速开始

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

## 配置项

`cssSandbox(options: CssSandboxOptions)`
- `prefix`：必填，命名空间名称
- `include`/`exclude`：文件级过滤，控制哪些 `css/scss/less` 被处理
- `overlaySelectors`：需要生成双形式前缀的选择器（用于 Portal/Teleport 插入到 `body` 的组件）。
- `defaultExcludeSelectors`：默认排除选择器，若未设置为 `[:root, html, body]`。
- `excludeSelectors`：追加排除选择器，与默认排除合并。

前缀合并示例（`prefix = 'app1'`）：

```css
/* 原始 */
.el-dialog { }

/* 常规前缀 */
.app1 .button { }

/* 命中 overlaySelectors='.el-' 的双形式前缀 */
.app1 .el-dialog, .app1.el-dialog { }

/* 命中 excludeSelectors=':root' 的保留原样 */
:root { --color: #000; }
```

---

## English

### Overview
- A Vite plugin that adds an application namespace prefix to CSS selectors.
- Supports dual-prefix form for components inserted into `body` via Portal/Teleport (e.g., Modal/Overlay): `.<namespace> <selector>, .<namespace><selector>`.

### Install
```bash
npm i vite-plugin-sandbox-css -D
# or
pnpm add vite-plugin-sandbox-css -D
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

### Options
- `prefix`: Required. Namespace (the plugin uses `.${prefix}` internally).
- `include`/`exclude`: File-level filtering to select which `css/scss/less` are processed.
- `overlaySelectors`: Selectors that should get dual-prefix form for overlays/portals.
- `defaultExcludeSelectors`: Default selectors to keep unchanged (defaults to `:root/html/body`).
- `excludeSelectors`: Additional exclude selectors merged with defaults.

### Prefix Examples
```css
/* original */
.el-dialog { }

/* regular prefix */
.app1 .button { }

/* dual prefix for overlaySelectors='.el-' */
.app1 .el-dialog, .app1.el-dialog { }

/* unchanged for excludeSelectors=':root' */
:root { --color: #000; }
```
