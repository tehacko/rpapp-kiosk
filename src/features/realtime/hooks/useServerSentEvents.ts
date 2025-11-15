import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useErrorHandler, getEnvironmentConfig, API_ENDPOINTS } from 'pi-kiosk-shared';
import { NetworkError } from 'pi-kiosk-shared';
import { useMessageQueue } from './useMessageQueue';

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
  const isConnectingRef = useRef(false);
  const { handleError } = useErrorHandler();

  // Message queue for offline scenarios
  const { enqueue: enqueueMessage, processQueue } = useMessageQueue({
    onMessage: (message) => {
      // Process queued messages through the same handler
      if (onMessage) {
        onMessage(message);
      }
    },
  });

  // CRITICAL: Memoize config to prevent unnecessary reconnections
  const config = useMemo(() => getEnvironmentConfig(), []);
  // CRITICAL: Memoize sseUrl to prevent unnecessary reconnections
  const sseUrl = useMemo(
    () => `${config.apiUrl}${API_ENDPOINTS.EVENTS.replace(':kioskId', kioskId.toString())}`,
    [config.apiUrl, kioskId]
  );
  
  // Debug logging (only log when URL actually changes)
  useEffect(() => {
  console.log('🔧 SSE Configuration:', {
    sseUrl,
    kioskId,
    environment: typeof window !== 'undefined' ? window.location.hostname : 'server'
  });
  }, [sseUrl, kioskId]);

  // Store callbacks in refs to prevent stale closures and dependency issues
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onErrorRef = useRef(onError);
  
  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onConnectRef.current = onConnect;
    onErrorRef.current = onError;
  }, [onMessage, onConnect, onError]);

  const connect = useCallback(() => {
    if (!enabled) {
      console.log('⏭️ SSE connection disabled');
      return;
    }
    
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log('⏳ SSE connection already in progress, skipping');
      return;
    }

    // Check if already connected
    if (eventSourceRef.current) {
      const readyState = eventSourceRef.current.readyState;
      if (readyState === EventSource.OPEN) {
        console.log('✅ SSE already connected, skipping');
        return;
      }
      if (readyState === EventSource.CONNECTING) {
        console.log('⏳ SSE already connecting (readyState: CONNECTING), skipping');
        return;
      }
      // If CLOSED, we need to create a new connection
      console.log('🧹 Closing existing SSE connection (readyState: CLOSED)');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    // Mark as connecting
    isConnectingRef.current = true;

    try {
      console.log(`🔗 Creating new EventSource connection to: ${sseUrl}`);
      eventSourceRef.current = new EventSource(sseUrl);
      
      const initialReadyState = eventSourceRef.current.readyState;
      console.log(`📊 EventSource created, initial readyState: ${initialReadyState} (0=CONNECTING, 1=OPEN, 2=CLOSED)`);

      // Set up connection timeout check - increased to 10 seconds to allow for slow connections
      const connectionTimeout = setTimeout(() => {
        if (eventSourceRef.current && eventSourceRef.current.readyState !== EventSource.OPEN && !isConnected) {
          isConnectingRef.current = false;
          console.error('⏰ SSE connection timeout - readyState still not OPEN after 10 seconds:', {
            readyState: eventSourceRef.current.readyState,
            readyStateText: eventSourceRef.current.readyState === 0 ? 'CONNECTING' : eventSourceRef.current.readyState === 1 ? 'OPEN' : 'CLOSED',
            url: sseUrl,
            isConnected
          });
          // Don't close immediately - wait a bit more in case onmessage fires
          // The connection might still work even if onopen doesn't fire
          console.warn('⚠️ Waiting 2 more seconds for first message before closing...');
          setTimeout(() => {
            if (!isConnected && eventSourceRef.current) {
              console.error('❌ Closing SSE connection after extended timeout');
              eventSourceRef.current.close();
              eventSourceRef.current = null;
              setIsConnected(false);
              const error = new NetworkError('SSE connection timeout');
              setConnectionError(error.message);
              onErrorRef.current?.(error);
            }
          }, 2000);
        }
      }, 10000); // Increased to 10 seconds

      eventSourceRef.current.onopen = () => {
        clearTimeout(connectionTimeout);
        isConnectingRef.current = false;
        console.log('✅ 📡 SSE CONNECTED successfully!', {
          url: sseUrl,
          readyState: eventSourceRef.current?.readyState,
          timestamp: new Date().toISOString()
        });
        setIsConnected(true);
        setConnectionError(null);
        setReconnectAttempts(0);
        onConnectRef.current?.();
        // Process any queued messages now that we're connected
        processQueue();
      };

      eventSourceRef.current.onmessage = (event) => {
        try {
          // CRITICAL: If we receive ANY message, the connection is definitely open
          // Some browsers don't fire onopen reliably, so treat first message as connection
          if (!isConnected) {
            clearTimeout(connectionTimeout);
            isConnectingRef.current = false;
            console.log('✅ SSE connection confirmed by receiving first message (onopen may not have fired)');
            setIsConnected(true);
            setConnectionError(null);
            setReconnectAttempts(0);
            onConnectRef.current?.();
            // Process any queued messages now that we're connected
            processQueue();
          }

          const message: SSEMessage = JSON.parse(event.data);
          
          // Handle ping responses
          if (message.type === 'ping') {
            console.log('💓 SSE ping received');
            return;
          }
          
          // Handle connection confirmation
          if (message.type === 'connection') {
            console.log('✅ SSE connection confirmed by server:', message);
            return;
          }
          
          console.log('📨 SSE message received:', {
            type: message.type,
            updateType: message.updateType,
            data: message.data,
            timestamp: message.timestamp
          });
          
          // If online, process immediately; otherwise queue for later
          if (navigator.onLine) {
            onMessageRef.current?.(message);
          } else {
            console.log('📦 Offline: queuing message for later processing');
            enqueueMessage(message);
          }
        } catch (error) {
          console.error('❌ Error parsing SSE message:', error, 'Raw data:', event.data);
          handleError(error as Error, 'useSSE.onmessage');
        }
      };

      eventSourceRef.current.onerror = (event) => {
        const readyState = eventSourceRef.current?.readyState;
        const readyStateText = readyState === 0 ? 'CONNECTING' : readyState === 1 ? 'OPEN' : 'CLOSED';
        
        console.error('❌ SSE ERROR event:', {
          readyState,
          readyStateText,
          url: sseUrl,
          event,
          timestamp: new Date().toISOString()
        });
        
        clearTimeout(connectionTimeout);
        
        // If connection is closed, it means connection failed
        if (readyState === EventSource.CLOSED) {
          isConnectingRef.current = false;
          const error = new NetworkError('SSE connection closed/failed');
          console.error('❌ SSE connection failed - readyState is CLOSED');
        setConnectionError(error.message);
          setIsConnected(false);
        handleError(error, 'useSSE.onerror');
          onErrorRef.current?.(error);
        } else if (readyState === EventSource.CONNECTING) {
          // Still connecting - this might be a temporary error
          console.warn('⚠️ SSE error while CONNECTING - may retry');
        }
      };

    } catch (error) {
      console.error('❌ Failed to create EventSource:', error);
      const networkError = new NetworkError('Nepodařilo se vytvořit SSE připojení');
      setConnectionError(networkError.message);
      handleError(networkError, 'useSSE.connect');
    }
  }, [enabled, sseUrl, handleError]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    isConnectingRef.current = false;
    
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

  // Main effect - run when enabled or sseUrl changes (sseUrl changes when kioskId changes)
  useEffect(() => {
    console.log(`🔄 SSE useEffect triggered: enabled=${enabled}, kioskId=${kioskId}, sseUrl=${sseUrl}`);
    
    if (!enabled) {
      console.log('⏭️ SSE disabled, disconnecting');
      disconnect();
      return;
    }

    shouldReconnectRef.current = true;
    console.log('🚀 Calling connect() from useEffect');
    connect();

    return () => {
      console.log('🧹 SSE useEffect cleanup - disconnecting');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sseUrl]); // Only depend on enabled and sseUrl - connect/disconnect are stable callbacks

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
