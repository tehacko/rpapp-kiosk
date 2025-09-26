import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  WebSocketMessage, 
  NetworkError, 
  APP_CONFIG, 
  useErrorHandler 
} from 'pi-kiosk-shared';

interface UseWebSocketOptions {
  kioskId?: number;
  url?: string;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enabled?: boolean;
}

export function useWebSocket({
  kioskId = 1,
  url,
  onMessage,
  onError,
  onConnect,
  onDisconnect,
  reconnectInterval = APP_CONFIG.WS_RECONNECT_INTERVAL,
  maxReconnectAttempts = APP_CONFIG.WS_RECONNECT_ATTEMPTS,
  enabled = true
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const shouldReconnect = useRef(true);
  const { handleError } = useErrorHandler();

  // Determine WebSocket URL
  const wsUrl = url || (() => {
    const baseUrl = process.env.REACT_APP_API_URL || APP_CONFIG.DEFAULT_API_URL;
    const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
    const wsBaseUrl = baseUrl.replace(/^https?/, wsProtocol);
    return `${wsBaseUrl}?kioskId=${kioskId}`;
  })();

  const startHeartbeat = useCallback(() => {
    const sendHeartbeat = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ 
            type: 'ping', 
            kioskId,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          handleError(error as Error, 'useWebSocket.sendHeartbeat');
        }
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Set up recurring heartbeat
    heartbeatTimeoutRef.current = setInterval(
      sendHeartbeat, 
      APP_CONFIG.WS_HEARTBEAT_INTERVAL
    );
  }, [kioskId, handleError]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      console.log(`🔗 Connecting to WebSocket: ${wsUrl}`);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('📡 WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        
        startHeartbeat();
        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Handle pong responses
          if (message.type === 'pong') {
            // Heartbeat acknowledged
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

        // Attempt to reconnect if not manually closed
        if (shouldReconnect.current && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(
            reconnectInterval * Math.pow(2, reconnectAttempts.current), 
            30000 // Max 30 seconds
          );
          reconnectAttempts.current++;
          
          console.log(
            `🔄 Attempting to reconnect in ${delay}ms (${reconnectAttempts.current}/${maxReconnectAttempts})`
          );
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          const error = new NetworkError('Nepodařilo se obnovit připojení k serveru');
          setConnectionError(error.message);
          handleError(error, 'useWebSocket.maxReconnectAttemptsReached');
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
  }, [
    enabled, 
    wsUrl, 
    onMessage, 
    onError, 
    onConnect, 
    onDisconnect, 
    reconnectInterval, 
    maxReconnectAttempts,
    startHeartbeat,
    stopHeartbeat,
    handleError
  ]);

  const disconnect = useCallback(() => {
    shouldReconnect.current = false;
    
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
    shouldReconnect.current = true;
    reconnectAttempts.current = 0;
    setConnectionError(null);
    disconnect();
    setTimeout(connect, 100); // Small delay before reconnecting
  }, [connect, disconnect]);

  const sendMessage = useCallback((message: Partial<WebSocketMessage>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        const fullMessage: WebSocketMessage = {
          type: message.type || 'message',
          kioskId,
          timestamp: new Date().toISOString(),
          ...message
        };
        
        wsRef.current.send(JSON.stringify(fullMessage));
        return true;
      } catch (error) {
        handleError(error as Error, 'useWebSocket.sendMessage');
        return false;
      }
    }
    return false;
  }, [kioskId, handleError]);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    connectionError,
    reconnect,
    disconnect,
    sendMessage,
    // Computed properties
    canSendMessage: isConnected && !connectionError,
    reconnectAttempts: reconnectAttempts.current,
    maxReconnectAttempts
  };
}
