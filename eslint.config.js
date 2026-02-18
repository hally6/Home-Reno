const js = require('@eslint/js');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const reactNativePlugin = require('eslint-plugin-react-native');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      '.test-dist/**',
      'docs/**',
      'skills/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'babel.config.js',
      'metro.config.js',
      'eslint.config.js'
    ]
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      },
      globals: {
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-native': reactNativePlugin
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'no-undef': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/use-memo': 'off',
      'react-native/no-inline-styles': 'off',
      'react-native/no-color-literals': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  },
  prettierConfig
];
