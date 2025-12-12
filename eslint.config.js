import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default tseslint.config(
  // Ignore patterns (replaces .eslintignore)
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '*.min.js',
      '*.bundle.js',
      'scripts/generate-runtime-config.js',
      'start.js',
      'deploy-kiosk.js',
      'public/**',
      '*.log',
    ],
  },
  
  // Base recommended configs
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  
  // React plugin config
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
        ecmaFeatures: {
          jsx: true,
        },
        // Type-aware linting - uses tsconfig.json
        project: resolve(__dirname, 'tsconfig.json'),
        tsconfigRootDir: __dirname,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // TypeScript best practices
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { 
        prefer: 'type-imports', 
        fixStyle: 'separate-type-imports' 
      }],
      
      // React best practices - Component structure
      'react/function-component-definition': ['warn', {
        namedComponents: 'function-declaration',
        unnamedComponents: 'arrow-function',
      }],
      'react/jsx-no-useless-fragment': 'warn',
      'react/jsx-key': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/jsx-uses-react': 'off', // Not needed with new JSX transform
      'react/jsx-uses-vars': 'error',
      'react/no-array-index-key': 'warn',
      'react/no-danger': 'warn',
      'react/no-deprecated': 'warn',
      'react/no-direct-mutation-state': 'error',
      'react/no-unescaped-entities': 'warn',
      'react/no-unknown-property': 'error',
      'react/prop-types': 'off', // Using TypeScript instead
      'react/react-in-jsx-scope': 'off',
      'react/self-closing-comp': 'warn',
      'react/void-dom-elements-no-children': 'error',
      
      // React Hooks best practices
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // React Refresh (for Vite HMR)
      'react-refresh/only-export-components': ['warn', { 
        allowConstantExport: true 
      }],
      
      // Code quality
      'no-console': ['warn', { 
        allow: ['warn', 'error', 'info']
      }],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-unused-expressions': 'error',
      'no-debugger': 'error',
      'no-array-constructor': 'error',
      'no-new-object': 'error',
      'prefer-template': 'warn',
      'prefer-spread': 'warn',
    },
  },
  
  // Test files - relaxed rules
  {
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-console': 'off',
    },
  },
  
  // Config files - relaxed rules
  {
    files: ['*.config.{js,ts}', 'vite.config.{js,ts}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  
  // Type declaration files - relaxed rules
  {
    files: ['*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-indexed-object-style': 'off',
    },
  },
);
