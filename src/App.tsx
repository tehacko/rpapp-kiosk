import './App.css';
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './shared/components';
import { KioskConfigProvider, KioskApp } from './features/kiosk';
import { ThePaySuccessPage } from './pages/ThePaySuccessPage';
import { ThePayMobileThanks } from './pages/ThePayMobileThanks';

function App() {
  return (
    <ErrorBoundary>
      <KioskConfigProvider>
        <Routes>
          <Route path="/" element={<KioskApp />} />
          <Route path="/payment/thepay-success" element={<ThePaySuccessPage />} />
          <Route path="/payment/thepay-mobile-thanks" element={<ThePayMobileThanks />} />
        </Routes>
      </KioskConfigProvider>
    </ErrorBoundary>
  );
}

export default App;