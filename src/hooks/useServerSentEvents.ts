import { useState, useRef, useCallback, useEffect } from 'react';
import { useErrorHandler, getEnvironmentConfig, API_ENDPOINTS } from 'pi-kiosk-shared';
import { NetworkError } from 'pi-kiosk-shared';

export interface SSEMessage {
  type: string;
  updateType?: string;
  data?: any;
  timestamp?: string;
}

export interface UseSSEOptions {
  kioskId: number;
  enabled?: boolean;
  onMessage?: (message: SSEMessage) => void;
  onConnect?: () => void;
  onError?: (error: Error) => void;
  maxReconnectAttempts?: number;
}

export interface UseSSEReturn {
  isConnected: boolean;
  connectionError: string | null;
  canSendMessage: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  sendMessage: (message: Omit<SSEMessage, 'kioskId' | 'timestamp'>) => boolean;
}

export function useServerSentEvents({
  kioskId,
  enabled = true,
  onMessage,
  onConnect,
  onError,
  maxReconnectAttempts = 5
}: UseSSEOptions): UseSSEReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);
  const { handleError } = useErrorHandler();

  const config = getEnvironmentConfig();
  const sseUrl = `${config.apiUrl}${API_ENDPOINTS.EVENTS.replace(':kioskId', kioskId.toString())}`;
  
  // Debug logging
  console.log('🔧 SSE Configuration:', {
    config,
    sseUrl,
    kioskId,
    environment: typeof window !== 'undefined' ? window.location.hostname : 'server'
  });

  const connect = useCallback(() => {
    if (!enabled || (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.OPEN)) {
      return;
    }

    // Clear any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      console.log(`🔗 Connecting to SSE: ${sseUrl}`);
      eventSourceRef.current = new EventSource(sseUrl);

      eventSourceRef.current.onopen = () => {
        console.log('📡 SSE connected');
        setIsConnected(true);
        setConnectionError(null);
        setReconnectAttempts(0);
        onConnect?.();
      };

      eventSourceRef.current.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);
          
          // Handle ping responses
          if (message.type === 'ping') {
            return;
          }
          
          onMessage?.(message);
        } catch (error) {
          handleError(error as Error, 'useSSE.onmessage');
        }
      };

      eventSourceRef.current.onerror = (event) => {
        const error = new NetworkError('Chyba SSE připojení');
        console.error('SSE error:', event);
        console.error('SSE URL attempted:', sseUrl);
        console.error('SSE readyState:', eventSourceRef.current?.readyState);
        setConnectionError(error.message);
        handleError(error, 'useSSE.onerror');
        onError?.(error);
      };

    } catch (error) {
      const networkError = new NetworkError('Nepodařilo se vytvořit SSE připojení');
      setConnectionError(networkError.message);
      handleError(networkError, 'useSSE.connect');
    }
  }, [enabled, sseUrl, onMessage, onError, onConnect, handleError]); // Remove kioskId from dependencies

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionError(null);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    shouldReconnectRef.current = true;
    setReconnectAttempts(0);
    connect();
  }, [disconnect, connect]);

  const sendMessage = useCallback((_message: Omit<SSEMessage, 'kioskId' | 'timestamp'>): boolean => {
    // SSE is one-way communication, so we can't send messages back
    // This is a limitation of SSE compared to WebSocket
    console.warn('SSE does not support sending messages to server');
    return false;
  }, []);

  // Main effect - only run when enabled changes
  useEffect(() => {
    if (!enabled) {
      disconnect();
      return;
    }

    shouldReconnectRef.current = true;
    connect();

    return () => {
      shouldReconnectRef.current = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      setIsConnected(false);
      setConnectionError(null);
    };
  }, [enabled]); // Remove connect and disconnect from dependencies to prevent infinite loop

  return {
    isConnected,
    connectionError,
    canSendMessage: false, // SSE doesn't support sending messages
    reconnectAttempts,
    maxReconnectAttempts,
    connect,
    disconnect,
    reconnect,
    sendMessage
  };
}
