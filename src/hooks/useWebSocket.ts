import { useState, useRef, useCallback, useEffect } from 'react';
import { useErrorHandler, getEnvironmentConfig } from 'pi-kiosk-shared';
import { NetworkError } from 'pi-kiosk-shared';

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
}

export interface UseWebSocketOptions {
  kioskId: number;
  enabled?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  connectionError: string | null;
  canSendMessage: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  sendMessage: (message: Omit<WebSocketMessage, 'kioskId' | 'timestamp'>) => boolean;
}

export function useWebSocket({
  kioskId,
  enabled = true,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
  heartbeatInterval = 30000
}: UseWebSocketOptions): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);
  const { handleError } = useErrorHandler();

  const config = getEnvironmentConfig();
  const wsUrl = `${config.wsUrl}?kioskId=${kioskId}`;

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }
    
    heartbeatTimeoutRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const pingMessage = {
          type: 'ping',
          kioskId,
          timestamp: new Date().toISOString()
        };
        
        try {
          wsRef.current.send(JSON.stringify(pingMessage));
          startHeartbeat(); // Schedule next heartbeat
        } catch (error) {
          console.error('Failed to send heartbeat:', error);
        }
      }
    }, heartbeatInterval);
  }, [kioskId, heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled || (wsRef.current && wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    // Clear any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      console.log(`🔗 Connecting to WebSocket: ${wsUrl}`);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('📡 WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        setReconnectAttempts(0);
        startHeartbeat();
        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Handle pong responses
          if (message.type === 'pong') {
            return;
          }
          
          onMessage?.(message);
        } catch (error) {
          handleError(error as Error, 'useWebSocket.onmessage');
        }
      };

      wsRef.current.onclose = (event) => {
        console.log(`📡 WebSocket disconnected: ${event.code} - ${event.reason}`);
        setIsConnected(false);
        stopHeartbeat();
        onDisconnect?.();

        // Only attempt to reconnect if not manually closed and should reconnect
        if (shouldReconnectRef.current && event.code !== 1000) {
          setReconnectAttempts(prev => {
            if (prev < maxReconnectAttempts) {
              const delay = Math.min(
                reconnectInterval * Math.pow(2, prev), 
                30000 // Max 30 seconds
              );
              
              console.log(
                `🔄 Attempting to reconnect in ${delay}ms (${prev + 1}/${maxReconnectAttempts})`
              );
              
              reconnectTimeoutRef.current = setTimeout(() => {
                if (enabled && shouldReconnectRef.current) {
                  connect();
                }
              }, delay);
              
              return prev + 1;
            } else {
              const error = new NetworkError('Nepodařilo se obnovit připojení k serveru');
              setConnectionError(error.message);
              handleError(error, 'useWebSocket.maxReconnectAttemptsReached');
              return prev;
            }
          });
        }
      };

      wsRef.current.onerror = (event) => {
        const error = new NetworkError('Chyba WebSocket připojení');
        console.error('WebSocket error:', event);
        setConnectionError(error.message);
        handleError(error, 'useWebSocket.onerror');
        onError?.(error);
      };

    } catch (error) {
      const networkError = new NetworkError('Nepodařilo se vytvořit WebSocket připojení');
      setConnectionError(networkError.message);
      handleError(networkError, 'useWebSocket.connect');
    }
  }, [enabled, wsUrl, kioskId, onMessage, onError, onConnect, onDisconnect, reconnectInterval, maxReconnectAttempts, startHeartbeat, stopHeartbeat, handleError]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    stopHeartbeat();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionError(null);
  }, [stopHeartbeat]);

  const reconnect = useCallback(() => {
    disconnect();
    shouldReconnectRef.current = true;
    setReconnectAttempts(0);
    connect();
  }, [disconnect, connect]);

  const sendMessage = useCallback((message: Omit<WebSocketMessage, 'kioskId' | 'timestamp'>): boolean => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const fullMessage = {
        ...message,
        kioskId,
        timestamp: new Date().toISOString()
      };
      
      wsRef.current.send(JSON.stringify(fullMessage));
      return true;
    } catch (error) {
      handleError(error as Error, 'useWebSocket.sendMessage');
      return false;
    }
  }, [kioskId, handleError]);

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
      
      stopHeartbeat();
      
      if (wsRef.current) {
        wsRef.current.close(1000, 'Manual disconnect');
        wsRef.current = null;
      }
      
      setIsConnected(false);
      setConnectionError(null);
    };
  }, [enabled, connect, disconnect, stopHeartbeat]);

  return {
    isConnected,
    connectionError,
    canSendMessage: isConnected,
    reconnectAttempts,
    maxReconnectAttempts,
    connect,
    disconnect,
    reconnect,
    sendMessage
  };
}