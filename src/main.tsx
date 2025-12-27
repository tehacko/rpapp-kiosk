import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { loadRuntimeConfig } from './runtimeConfig';
import { buildTenantBaseName } from './shared/tenant';

const rootElement = document.getElementById('root');

async function bootstrap(): Promise<void> {
  await loadRuntimeConfig();

  if (!rootElement) {
    throw new Error('Root element not found');
  }

  const App = (await import('./App.tsx')).default;
  const basename = buildTenantBaseName();

  createRoot(rootElement).render(
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  );
}

void bootstrap();
