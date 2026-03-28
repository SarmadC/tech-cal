import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".expo/**",
      "apps/mobile/**",
      "packages/**",
      "out/**",
      "build/**",
      "dist/**",
      "coverage/**",
      "scripts/**",
      "*.config.{js,mjs,ts}",
      "playwright-report/**",
      "test-results/**",
      "next",
      ".tmp-*/**",
      ".tmp-*",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/__tests__/**",
      "vitest.setup.ts",
      "test-cheerio.js",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "@next/next": nextPlugin,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "no-undef": "off",
      "no-empty": [
        "error",
        {
          "allowEmptyCatch": true,
        },
      ],
      "no-useless-escape": "warn",
      "no-prototype-builtins": "warn",

      // React rules
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
      
      // TypeScript rules
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      
      // Next.js specific rules (from next/core-web-vitals)
      "@next/next/no-html-link-for-pages": "error",
      "@next/next/no-img-element": "warn",
      "@next/next/no-unwanted-polyfillio": "error",
      "@next/next/no-page-custom-font": "error",
      "react/no-unescaped-entities": "warn",
      "react/no-unknown-property": [
        "warn",
        {
          "ignore": ["global", "jsx"]
        }
      ],
      "no-restricted-imports": [
        "error",
        {
          "patterns": [
            "expo",
            "expo-*",
            "react-native",
            "react-native-*"
          ]
        }
      ]
    },
  },
  {
    files: ["apps/mobile/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];
