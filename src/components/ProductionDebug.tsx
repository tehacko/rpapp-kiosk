import { useState, useEffect } from 'react';
import { getEnvironmentConfig, getCurrentEnvironment, createAPIClient, API_ENDPOINTS } from 'pi-kiosk-shared';

interface ProductionDebugProps {
  paymentId?: string;
}

export function ProductionDebug({ paymentId }: ProductionDebugProps) {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [apiTestResults, setApiTestResults] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  const apiClient = createAPIClient();

  useEffect(() => {
    const config = getEnvironmentConfig();
    const environment = getCurrentEnvironment();
    
    setDebugInfo({
      environment,
      apiUrl: config.apiUrl,
      nodeEnv: process.env.NODE_ENV,
      location: window.location.href,
      hostname: window.location.hostname,
      isRailway: window.location.hostname.includes('railway.app'),
      timestamp: new Date().toISOString()
    });
  }, []);

  const testApiEndpoints = async () => {
    const results: any = {};
    
    try {
      // Test health endpoint
      const healthResponse = await apiClient.get('/health');
      results.health = { success: true, data: healthResponse };
    } catch (error) {
      results.health = { success: false, error: (error as any).message };
    }

    try {
      // Test new cancel endpoint
      const cancelResponse = await apiClient.post(API_ENDPOINTS.PAYMENT_CANCEL, {
        paymentId: paymentId || 'test-payment-id'
      });
      results.cancel = { success: true, data: cancelResponse };
    } catch (error) {
      results.cancel = { success: false, error: (error as any).message };
    }

    try {
      // Test new monitoring endpoint
      const monitoringResponse = await apiClient.post(API_ENDPOINTS.PAYMENT_START_MONITORING, {
        paymentId: paymentId || 'test-payment-id'
      });
      results.monitoring = { success: true, data: monitoringResponse };
    } catch (error) {
      results.monitoring = { success: false, error: (error as any).message };
    }

    setApiTestResults(results);
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 9999,
          background: 'red',
          color: 'white',
          padding: '5px 10px',
          border: 'none',
          borderRadius: '4px',
          fontSize: '12px'
        }}
      >
        🐛 Debug
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: 9999,
      background: 'white',
      border: '2px solid #ccc',
      borderRadius: '8px',
      padding: '15px',
      maxWidth: '400px',
      maxHeight: '80vh',
      overflow: 'auto',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '14px' }}>🐛 Production Debug</h3>
        <button onClick={() => setIsVisible(false)} style={{ background: 'none', border: 'none', fontSize: '16px' }}>×</button>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 5px 0', fontSize: '12px' }}>Environment Info:</h4>
        <pre style={{ fontSize: '10px', background: '#f5f5f5', padding: '8px', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={testApiEndpoints}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Test API Endpoints
        </button>
      </div>

      {apiTestResults && (
        <div>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '12px' }}>API Test Results:</h4>
          <pre style={{ fontSize: '10px', background: '#f5f5f5', padding: '8px', borderRadius: '4px', overflow: 'auto' }}>
            {JSON.stringify(apiTestResults, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
