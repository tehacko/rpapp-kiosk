import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket } from './useWebSocket';

// Mock the shared package
jest.mock('pi-kiosk-shared', () => ({
  ...jest.requireActual('pi-kiosk-shared'),
  useErrorHandler: jest.fn(() => ({
    handleError: jest.fn()
  })),
  getEnvironmentConfig: jest.fn(() => ({
    apiUrl: 'http://localhost:3015',
    wsUrl: 'ws://localhost:3015'
  }))
}));

// Simple WebSocket mock
class MockWebSocket {
  public readyState: number = 0; // CONNECTING
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  
  public addEventListener = jest.fn();
  public removeEventListener = jest.fn();
  public close = jest.fn();
  public send = jest.fn();

  constructor(public url: string) {
    // Auto-connect after a short delay
    setTimeout(() => {
      if (this.onopen) {
        this.readyState = 1; // OPEN
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  // Test helper methods
  public _simulateOpen() {
    this.readyState = 1; // OPEN
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  public _simulateError() {
    this.readyState = 3; // CLOSED
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  public _simulateClose(code: number = 1000, reason: string = '') {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }

  public _simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }
}

// Mock global WebSocket
let mockWebSocketInstances: MockWebSocket[] = [];
(global as any).WebSocket = jest.fn((url: string) => {
  const instance = new MockWebSocket(url);
  mockWebSocketInstances.push(instance);
  return instance;
});

// Get the last created WebSocket instance
const getLastWebSocketInstance = (): MockWebSocket | undefined => {
  return mockWebSocketInstances[mockWebSocketInstances.length - 1];
};

// Clear all instances
const clearWebSocketInstances = () => {
  mockWebSocketInstances = [];
};

describe.skip('useWebSocket', () => {
  beforeEach(() => {
    clearWebSocketInstances();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useWebSocket({ kioskId: 1 }));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionError).toBe(null);
    expect(result.current.canSendMessage).toBe(false);
    expect(result.current.reconnectAttempts).toBe(0);
    expect(result.current.maxReconnectAttempts).toBe(5);
  });

  it('connects to WebSocket on mount', async () => {
    const onConnect = jest.fn();
    const { result } = renderHook(() => useWebSocket({ 
      kioskId: 1, 
      onConnect 
    }));

    // Wait for WebSocket to be created
    await waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalled();
    });

    // Fast-forward timers to trigger auto-connect
    act(() => {
      jest.advanceTimersByTime(20);
    });

    // Wait for connection to be established
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(result.current.connectionError).toBe(null);
    expect(onConnect).toHaveBeenCalled();
  });

  it('handles WebSocket connection error', async () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useWebSocket({ 
      kioskId: 1, 
      onError 
    }));

    // Wait for WebSocket to be created
    await waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalled();
    });

    // Get the WebSocket instance and simulate error
    const wsInstance = getLastWebSocketInstance();
    if (wsInstance) {
      act(() => {
        wsInstance._simulateError();
      });
    }

    await waitFor(() => {
      expect(result.current.connectionError).toBe('Chyba WebSocket připojení');
    });
    expect(onError).toHaveBeenCalled();
  });

  it('handles WebSocket disconnection', async () => {
    const onDisconnect = jest.fn();
    const { result } = renderHook(() => useWebSocket({ 
      kioskId: 1, 
      onDisconnect 
    }));

    // Wait for connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Then disconnect
    act(() => {
      const wsInstance = getLastWebSocketInstance();
      if (wsInstance) {
        wsInstance._simulateClose();
      }
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });
    expect(onDisconnect).toHaveBeenCalled();
  });

  it('sends messages when connected', async () => {
    const { result } = renderHook(() => useWebSocket({ kioskId: 1 }));

    // Wait for connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const wsInstance = getLastWebSocketInstance();
    if (wsInstance) {
      const success = result.current.sendMessage({
        type: 'test',
        data: 'test data'
      });

      expect(success).toBe(true);
      expect(wsInstance.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'test',
          data: 'test data',
          kioskId: 1,
          timestamp: expect.any(String)
        })
      );
    }
  });

  it('does not connect when disabled', () => {
    renderHook(() => useWebSocket({ 
      kioskId: 1, 
      enabled: false 
    }));

    expect(global.WebSocket).not.toHaveBeenCalled();
  });

  it('handles incoming messages', async () => {
    const onMessage = jest.fn();
    const { result } = renderHook(() => useWebSocket({ 
      kioskId: 1, 
      onMessage 
    }));

    // Wait for connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const wsInstance = getLastWebSocketInstance();
    if (wsInstance) {
      act(() => {
        wsInstance._simulateMessage({
          type: 'test',
          data: 'test message'
        });
      });

      expect(onMessage).toHaveBeenCalledWith({
        type: 'test',
        data: 'test message'
      });
    }
  });

  it('ignores pong messages', async () => {
    const onMessage = jest.fn();
    const { result } = renderHook(() => useWebSocket({ 
      kioskId: 1, 
      onMessage 
    }));

    // Wait for connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const wsInstance = getLastWebSocketInstance();
    if (wsInstance) {
      act(() => {
        wsInstance._simulateMessage({
          type: 'pong'
        });
      });

      expect(onMessage).not.toHaveBeenCalled();
    }
  });

  it('disconnects manually', async () => {
    const { result } = renderHook(() => useWebSocket({ kioskId: 1 }));

    // Wait for connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Disconnect manually
    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
  });

  it('reconnects manually', async () => {
    const { result } = renderHook(() => useWebSocket({ kioskId: 1 }));

    // Wait for initial connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Disconnect and reconnect
    act(() => {
      result.current.disconnect();
    });

    act(() => {
      result.current.reconnect();
    });

    // Should create a new WebSocket
    expect(global.WebSocket).toHaveBeenCalledTimes(2);
  });
});