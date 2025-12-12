# Kiosk Frontend - React Best Practices Analysis & Refactoring Plan

## Current State Analysis

### Component Size Analysis
- **ThePayPayment.tsx**: 530 lines ⚠️ **CRITICAL** - Needs major refactoring
- **QRDisplay.tsx**: 233 lines ⚠️ **HIGH** - Timer logic should be extracted
- **PaymentForm.tsx**: 212 lines ⚠️ **HIGH** - Multiple responsibilities
- **PaymentScreen.tsx**: 181 lines ⚠️ **MEDIUM** - Could extract sub-components
- **ProductGrid.tsx**: 153 lines ✅ Acceptable
- **KioskScreenRouter.tsx**: 132 lines ✅ Acceptable
- **Cart.tsx**: 112 lines ✅ Acceptable
- **ProductsScreen.tsx**: 100 lines ✅ Acceptable

## Issues Identified

### 1. ThePayPayment.tsx (530 lines) - CRITICAL
**Problems:**
- Multiple responsibilities: payment creation, SSE handling, polling, QR generation, rendering
- Complex state management with multiple refs
- Hard to test and maintain
- Violates Single Responsibility Principle

**Should be broken into:**
- `useThePayPayment` hook - payment creation & state management
- `useThePayPolling` hook - polling logic
- `useThePaySSE` hook - SSE message handling
- `ThePayPaymentContainer` - orchestrates hooks
- `ThePayQRDisplay` - QR display component
- `ThePayErrorDisplay` - error display component
- `ThePayProcessingIndicator` - loading/processing component

### 2. PaymentForm.tsx (212 lines) - HIGH
**Problems:**
- Handles 4 different steps (cart, email, payment method, processing)
- Email validation mixed with component logic
- Window event listeners for validation errors
- Multiple conditional renders

**Should be broken into:**
- `CartSummary` component - step 1 cart display
- `EmailInputForm` component - step 2 email input
- `PaymentMethodSelector` component - step 3 payment method buttons
- `ProcessingIndicator` component - step 5 processing state
- `useEmailValidation` hook - email validation logic

### 3. QRDisplay.tsx (233 lines) - HIGH
**Problems:**
- Complex timer logic mixed with display logic
- Multiple useEffect hooks for timer management
- Hard to test timer logic in isolation

**Should be broken into:**
- `usePaymentTimer` hook - all timer logic (countdown, checking state, event handling)
- `QRDisplay` component - pure display component
- `PaymentTimer` component - timer display (optional)

### 4. PaymentScreen.tsx (181 lines) - MEDIUM
**Problems:**
- Inline cart total bar component
- Inline button bar component
- Could be more composable

**Should be broken into:**
- `CartTotalBar` component - total price display
- `PaymentNavigationBar` component - back/next buttons
- Keep PaymentScreen as orchestrator

### 5. ProductsScreen.tsx (100 lines) - LOW
**Minor improvements:**
- Extract `PaymentUnavailableBanner` component

## React Best Practices Violations

### ❌ Issues Found:
1. **Large Components** - ThePayPayment, PaymentForm, QRDisplay exceed 200 lines
2. **Multiple Responsibilities** - Components doing too much
3. **Mixed Concerns** - Business logic mixed with presentation
4. **Window Event Listeners** - PaymentForm uses window events for validation (should use props/state)
5. **Complex useEffect Dependencies** - QRDisplay has complex timer effects
6. **Inline Components** - PaymentScreen has inline sub-components
7. **Prop Drilling** - Some components receive many props (PaymentScreen: 20+ props)

### ✅ Good Practices Found:
1. **Custom Hooks** - Good use of hooks for state management
2. **Memoization** - React.memo used appropriately
3. **Lazy Loading** - Components are lazy loaded
4. **Error Boundaries** - Proper error handling
5. **TypeScript** - Strong typing throughout
6. **Feature-based Structure** - Good folder organization

## Refactoring Priority

### Priority 1 (Critical - Do First):
1. **ThePayPayment.tsx** - Break into hooks + smaller components
2. **PaymentForm.tsx** - Extract step components
3. **QRDisplay.tsx** - Extract timer hook

### Priority 2 (High - Do Next):
4. **PaymentScreen.tsx** - Extract sub-components
5. **ProductsScreen.tsx** - Extract banner component

### Priority 3 (Nice to Have):
6. Reduce prop drilling with context where appropriate
7. Extract more shared UI components
8. Improve component composition patterns

## Recommended Component Structure

### ThePayPayment Refactoring:
```
ThePayPayment/
  ├── ThePayPayment.tsx (orchestrator, ~100 lines)
  ├── hooks/
  │   ├── useThePayPayment.ts (creation & state)
  │   ├── useThePayPolling.ts (polling logic)
  │   └── useThePaySSE.ts (SSE handling)
  ├── components/
  │   ├── ThePayQRDisplay.tsx
  │   ├── ThePayErrorDisplay.tsx
  │   └── ThePayProcessingIndicator.tsx
  └── index.ts
```

### PaymentForm Refactoring:
```
PaymentForm/
  ├── PaymentForm.tsx (orchestrator, ~80 lines)
  ├── components/
  │   ├── CartSummary.tsx
  │   ├── EmailInputForm.tsx
  │   ├── PaymentMethodSelector.tsx
  │   └── ProcessingIndicator.tsx
  ├── hooks/
  │   └── useEmailValidation.ts
  └── index.ts
```

### QRDisplay Refactoring:
```
QRDisplay/
  ├── QRDisplay.tsx (~80 lines, display only)
  ├── hooks/
  │   └── usePaymentTimer.ts (all timer logic)
  ├── components/
  │   └── PaymentTimer.tsx (optional)
  └── index.ts
```

## Best Practices to Apply

1. **Single Responsibility Principle** - Each component does one thing
2. **Component Composition** - Build complex UIs from simple components
3. **Custom Hooks for Logic** - Extract business logic to hooks
4. **Props over Events** - Use props/state instead of window events
5. **Small Components** - Target <150 lines per component
6. **Co-location** - Keep related files together
7. **Explicit Dependencies** - Clear prop interfaces
8. **Memoization Strategy** - Memo only when needed, with proper deps

## Testing Strategy

After refactoring:
- Unit test hooks in isolation
- Component tests for presentational components
- Integration tests for composed components
- Easier to test smaller, focused units
