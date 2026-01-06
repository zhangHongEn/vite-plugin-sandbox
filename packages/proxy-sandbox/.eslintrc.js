/**
 * Eslint 检查规则（A）
 * "off" 或者 0 -- 关闭规则
 * "warn" 或者 1 -- 将规则打开为警告（不影响退出代码）
 * "error" 或者 2 -- 将规则打开为错误（触发时退出代码为 1）
 */
module.exports = {
  // 告诉 eslint 找当前配置文件不能往父级查找
  root: true,

  // 指定 ESLint 要使用的环境
  env: {
    browser: true,
    es6: true,
    node: true,
  },

  // 指定javaScript语言类型和风格
  parserOptions: {
    // 指定js导入的方式，默认是script
    sourceType: 'module',
    // 解析器
    parser: 'babel-eslint',
    // ECMA版本
    ecmaVersion: 6,
  },

  // 指定了要加载的 ESLint 插件，插件名称省略了eslint-plugin-
  plugins: ['prettier'],

  // 要继承的规则和插件
  extends: [
    // eslint:recommended:表示引入eslint的核心功能，并且报告一些常见的共同错误。
    'eslint:recommended',
    'plugin:prettier/recommended',
  ],

  // 自定义或覆盖规则
  rules: {
    // 'no-console': 0,
  },
};
