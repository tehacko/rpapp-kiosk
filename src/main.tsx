import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { loadRuntimeConfig } from './runtimeConfig';

const rootElement = document.getElementById('root');

async function bootstrap(): Promise<void> {
  await loadRuntimeConfig();

  if (!rootElement) {
    throw new Error('Root element not found');
  }

  const App = (await import('./App.tsx')).default;

  createRoot(rootElement).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

void bootstrap();
