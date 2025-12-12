# ESLint Setup - React Best Practices Enforcement

This project uses ESLint with comprehensive React best practices rules to ensure code quality and maintainability.

## 🎯 Rules Enforced

### React Best Practices
- ✅ **Component Definition**: Function declarations for named components, arrow functions for unnamed
- ✅ **Hooks Rules**: Enforces Rules of Hooks and exhaustive dependencies
- ✅ **JSX Quality**: Keys, fragments, self-closing tags, no duplicate props
- ✅ **Anti-patterns**: Warns about array index keys, prevents direct state mutation
- ✅ **React Refresh**: Ensures proper HMR compatibility

### TypeScript Best Practices
- ✅ **No `any` types**: Errors on explicit `any` usage
- ✅ **Explicit Return Types**: Warns when functions lack return type annotations
- ✅ **Type Imports**: Enforces separate type imports (`import type`)
- ✅ **Null Safety**: Prefers nullish coalescing and optional chaining
- ✅ **Unused Variables**: Errors on unused vars (allows `_` prefix for intentionally unused)

### Code Quality
- ✅ **No Floating Promises**: Ensures all promises are handled
- ✅ **Prefer Const**: Enforces `const` over `let` where possible
- ✅ **Template Literals**: Prefers template strings over concatenation
- ✅ **No Debugger**: Prevents debugger statements in production code
- ✅ **Console Usage**: Warns on console.log (allows console.warn/error/info)

## 📋 Commands

```bash
# Check for linting errors
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

## 🔧 Configuration

- **Config File**: `eslint.config.js` (flat config format)
- **TypeScript Config**: Uses `tsconfig.json` for type-aware linting
- **Ignored Files**: See `.eslintignore`

## 📁 File-Specific Rules

### Test Files (`*.test.ts`, `*.test.tsx`, `__tests__/**`)
- Relaxed rules for `any` types
- No explicit return type requirement
- Console allowed

### Config Files (`*.config.{js,ts}`)
- Relaxed rules for `any` types
- Console allowed

## 🚀 Integration

### IDE Integration
Most IDEs (VS Code, WebStorm) will automatically detect and use this ESLint configuration.

### Pre-commit Hooks (Optional)
To enforce linting before commits, you can add a pre-commit hook:

```bash
npm install --save-dev husky lint-staged
```

Then add to `package.json`:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix"]
  }
}
```

## 📊 Current Status

All refactored components follow these rules:
- ✅ Component size < 150 lines
- ✅ Single responsibility principle
- ✅ Proper hook usage
- ✅ TypeScript strict typing
- ✅ No prop drilling anti-patterns
