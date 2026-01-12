# vite-plugin-sandbox

一个用于在 Vite 项目中实现「JS 运行时隔离」的插件，并配套独立的 CSS 命名空间插件（`vite-plugin-sandbox-css`），适合微前端等场景。

## 特性
- JS 沙箱：将未在局部作用域绑定的自由变量统一重写到代理 `window` 上，并通过虚拟模块注入运行时 `proxy-sandbox-browser`（`src/js-sandbox.js`）。
- CSS 命名空间：为样式选择器自动添加应用级前缀，支持包含/排除规则与前缀自定义（`src/css-sandbox.js`）。

## 安装

建议安装到项目中（`proxy-sandbox-browser` 为运行时依赖，需同时安装）：

```bash
npm i vite-plugin-sandbox vite-plugin-sandbox-css proxy-sandbox-browser -D
# 或
pnpm add vite-plugin-sandbox vite-plugin-sandbox-css proxy-sandbox-browser -D
```

> 本仓库为 monorepo，已包含 `proxy-sandbox-browser` 包；若在独立项目中使用，请确保能正常解析该包。

## 快速开始

在 `vite.config.ts` 中启用 JS 沙箱与 CSS 沙箱：

```ts
import { defineConfig } from 'vite';
import sandbox from 'vite-plugin-sandbox';
import cssSandbox from 'vite-plugin-sandbox-css';

export default defineConfig({
  plugins: [
    sandbox({
      appCode: 'app1',
      include: [/src/],
      exclude: [/node_modules/],
      sandboxOptions: {
        // 传递给 proxy-sandbox-browser 的运行时配置
      },
    }),
    cssSandbox({
      appCode: 'app1',
      cssInclude: [/src/],
      cssExclude: [],
      // 字符串或函数，控制应用前缀（默认：`.${appCode}`）
      perfix: (defaultPrefix) => defaultPrefix,
      postcssOptions: {
        // portalSelectors/exclude 影响前缀的合并策略（详见下文）
        portalSelectors: ['.el-', '#app'],
        exclude: [':root', 'html', 'body', '[data-vxe-ui-theme='],
        extendPortalSelectors: [],
        extendExclude: [],
      },
    }),
  ],
});
```

## 配置项

### JS 沙箱（默认导出）

`sandbox(options: { appCode?: string; include?: any[]; exclude?: any[]; sandboxOptions?: Record<string, any> })`

- `appCode`：应用标识，默认 `'app'`。会传递给运行时以区分不同应用。
- `include` / `exclude`：与 Rollup 的 `createFilter` 规则一致，用于控制需要处理的文件。插件内默认在 `exclude` 中排除了 `proxy-sandbox-browser`。
- `sandboxOptions`：透传给 `proxy-sandbox-browser` 的运行时配置对象。

行为说明：
- 插件会注入虚拟模块 `import __vite_sandbox_win__ from 'proxy-sandbox-browser?virtual=true'`。
- 通过 AST 将自由变量改写为 `__vite_sandbox_win__.proxy.xxx`，同时把对 `window` 的引用替换为 `__vite_sandbox_win__.proxy`。
- 仅处理扩展名为 `js/mjs/ts/vue/jsx/tsx` 的资源，跳过 `node_modules/vite/dist` 与 `.vue` 的样式子请求。

### CSS 沙箱（来自 `vite-plugin-sandbox-css`）

`cssSandbox(options: { appCode?: string; cssInclude?: any[]; cssExclude?: any[]; perfix?: string | (defaultPerfix: string) => string; postcssOptions?: { portalSelectors?: string[]; exclude?: string[]; extendPortalSelectors?: string[]; extendExclude?: string[] } })`

- `appCode`：应用标识，默认 `'app'`。默认前缀为 `.${appCode}`。
- `cssInclude` / `cssExclude`：用于筛选需要处理的样式文件（支持 `.css/.scss/.less`）。
- `perfix`：前缀字符串或返回前缀的函数。若未设置，则使用默认前缀 `.${appCode}`。
- `postcssOptions.portalSelectors`：命中这些选择器时会「合并选择器」——生成 `前缀 + 选择器` 与 `前缀连接选择器` 两种形式，用于处理通过 Portal/Teleport 插入到 `body` 的组件（如 Modal/Overlay）。
- `postcssOptions.exclude`：这些选择器保持原样（默认包含 `:root/html/body/[data-vxe-ui-theme=` 等）。
- `extendInclude` / `extendExclude`：在默认规则基础上追加。

选择器合并策略示例：

假设 `appCode = 'app1'`，`perfix = '.app1'`，且 `.el-` 在 `portalSelectors` 中：

```css
.el-dialog { /* 原始 */ }
/* 处理后会得到： */
.app1 .el-dialog, .app1.el-dialog { /* 命名空间 + 合并 */ }
```

若某选择器在 `exclude` 中（如 `:root`），则保持不变。

## 工作原理与代码位置
- JS 默认导出：`packages/vite-plugin-sandbox/src/index.js:1`。
- JS 沙箱插件：`packages/vite-plugin-sandbox/src/js-sandbox.js:10-63`。
- AST 工具：`packages/vite-plugin-sandbox/src/utils.js:53-93`、`packages/vite-plugin-sandbox/src/utils.js:18-46`。
- CSS 插件：`packages/vite-plugin-sandbox-css/src/index.ts`。

## 适配范围与限制
- 仅浏览器相关代码，Node 端不适用。
- JS 重写依赖 Babel AST，少数非常规语法可能需要自行评估。
- 自由变量会被重写到代理 `window`（例如 `document/console/Math` 等），运行时由 `proxy-sandbox-browser` 决定其行为与隔离范围。
- `.vue` 文件的样式子请求不会作为 JS 处理；CSS 插件仅处理 `css/scss/less` 文件。

## 常见问题
- 需要同时安装 `proxy-sandbox-browser` 吗？是的。JS 沙箱通过虚拟模块依赖其提供的 `getProxyWin` 以创建代理 `window`。
- 能与微前端框架一起用吗？可以。运行时包内部依赖了 `qiankun` 与 `import-html-entry`，可按需结合使用（具体配置参考运行时包）。
- 兼容的 Vite 版本？插件基于 `@rollup/pluginutils` 与标准 Vite 插件钩子实现，通常在 Vite 4/5 下工作良好。

## 构建与发布
- 构建：`npm run build`（Rollup 输出到 `dist/index.cjs` 与 `dist/index.mjs`）。
- 发布：`npm run pub`。

## 许可证

ISC
