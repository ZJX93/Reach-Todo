import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  {
    ignores: ["node_modules/**", "dist/**", "build/**", "../backend/static/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: { version: "detect" },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      // 让 ESLint 识别「仅在 JSX 中使用」的组件 / React 变量，避免误报未使用
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      // 防止在条件 / 循环里调用 Hook（真正会崩的写法）——保留为 error
      "react-hooks/rules-of-hooks": "error",
      // 本项目大量使用「仅挂载一次」或「仅依赖 year/month」的意图型 effect，
      // 强制 exhaustive-deps 只会逼出一堆 disable 噪音，故关闭。
      "react-hooks/exhaustive-deps": "off",
      // 未使用变量 / 导入：保持代码整洁（下划线开头的参数/变量允许忽略）
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
