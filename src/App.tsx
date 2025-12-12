import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './shared/components';
import { KioskConfigProvider } from './features/kiosk';
import { QueryProvider } from './features/products/providers/QueryProvider';

// Lazy load route-level components
const KioskApp = lazy(() =>
  import('./features/kiosk/components/KioskApp/KioskApp').then(module => ({
    default: module.KioskApp,
  }))
);

const ThePaySuccessPage = lazy(() =>
  import('./pages/ThePaySuccessPage').then(module => ({
    default: module.ThePaySuccessPage,
  }))
);

const ThePayMobileThanks = lazy(() =>
  import('./pages/ThePayMobileThanks').then(module => ({
    default: module.ThePayMobileThanks,
  }))
);

// Loading fallback component
function LoadingSpinner({ message = 'Načítám...' }: { message?: string }): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '1rem',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <p>{message}</p>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <QueryProvider>
      <KioskConfigProvider>
          <Suspense fallback={<LoadingSpinner message="Načítám..." />}>
        <Routes>
          <Route path="/" element={<KioskApp />} />
              <Route
                path="/payment/thepay-success"
                element={<ThePaySuccessPage />}
              />
              <Route
                path="/payment/thepay-mobile-thanks"
                element={<ThePayMobileThanks />}
              />
        </Routes>
          </Suspense>
      </KioskConfigProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default App;