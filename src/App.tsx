import './App.css';
import { ErrorBoundary } from './shared/components';
import { KioskConfigProvider, KioskApp } from './features/kiosk';

function App() {
  return (
    <ErrorBoundary>
      <KioskConfigProvider>
      <KioskApp />
      </KioskConfigProvider>
    </ErrorBoundary>
  );
}

export default App;