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
  circuitBreakerOpen: boolean;
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
  const [circuitBreakerOpen, setCircuitBreakerOpen] = useState(false);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckScheduleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);
  const isConnectingRef = useRef(false);
  const failureCountRef = useRef(0);
  const lastFailureTimeRef = useRef<number | null>(null);
  const circuitBreakerOpenRef = useRef(false);
  const enabledRef = useRef(enabled);
  const isConnectedRef = useRef(false);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckAttemptsRef = useRef(0);
  const healthCheckCurrentIntervalRef = useRef<number | null>(null);
  const healthCheckStartTimeRef = useRef<number | null>(null);
  const { handleError } = useErrorHandler();

  // Exponential backoff constants
  const INITIAL_RECONNECT_DELAY = 1000; // 1 second
  const MAX_RECONNECT_DELAY = 30000; // 30 seconds
  const BACKOFF_MULTIPLIER = 2;
  const CIRCUIT_BREAKER_THRESHOLD = 5;

  // Calculate reconnect delay with exponential backoff and max cap
  const calculateReconnectDelay = useCallback((attempt: number): number => {
    const exponentialDelay = INITIAL_RECONNECT_DELAY * Math.pow(BACKOFF_MULTIPLIER, attempt);
    return Math.min(exponentialDelay, MAX_RECONNECT_DELAY);
  }, []);

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
  // Get health check configuration from config
  const HEALTH_CHECK_INITIAL_INTERVAL = config.sseHealthCheckInitialInterval;
  const HEALTH_CHECK_BACKOFF_MULTIPLIER = config.sseHealthCheckBackoffMultiplier;
  const HEALTH_CHECK_MAX_INTERVAL = config.sseHealthCheckMaxInterval;
  const HEALTH_CHECK_MAX_ATTEMPTS = config.sseHealthCheckMaxAttempts;
  const HEALTH_CHECK_MAX_TOTAL_TIME = config.sseHealthCheckMaxTotalTime;
  
  // Calculate health check interval with exponential backoff
  const calculateHealthCheckInterval = useCallback((attempt: number): number => {
    const exponentialInterval = HEALTH_CHECK_INITIAL_INTERVAL * Math.pow(HEALTH_CHECK_BACKOFF_MULTIPLIER, attempt);
    return Math.min(exponentialInterval, HEALTH_CHECK_MAX_INTERVAL);
  }, [HEALTH_CHECK_INITIAL_INTERVAL, HEALTH_CHECK_BACKOFF_MULTIPLIER, HEALTH_CHECK_MAX_INTERVAL]);
  
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

  // Update refs when state changes (for callbacks that need current values)
  useEffect(() => {
    circuitBreakerOpenRef.current = circuitBreakerOpen;
  }, [circuitBreakerOpen]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

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

      // Clear any existing connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      // Set up connection timeout check - increased to 10 seconds to allow for slow connections
      connectionTimeoutRef.current = setTimeout(() => {
        // Use ref to check current state (avoids stale closure)
        if (eventSourceRef.current && eventSourceRef.current.readyState !== EventSource.OPEN && !isConnectedRef.current) {
          isConnectingRef.current = false;
          console.error('⏰ SSE connection timeout - readyState still not OPEN after 10 seconds:', {
            readyState: eventSourceRef.current.readyState,
            readyStateText: eventSourceRef.current.readyState === 0 ? 'CONNECTING' : eventSourceRef.current.readyState === 1 ? 'OPEN' : 'CLOSED',
            url: sseUrl,
            isConnected: isConnectedRef.current
          });
          // Don't close immediately - wait a bit more in case onmessage fires
          // The connection might still work even if onopen doesn't fire
          console.warn('⚠️ Waiting 2 more seconds for first message before closing...');
          setTimeout(() => {
            // Use ref to check current state (avoids stale closure)
            if (!isConnectedRef.current && eventSourceRef.current) {
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
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        isConnectingRef.current = false;
        console.log('✅ 📡 SSE CONNECTED successfully!', {
          url: sseUrl,
          readyState: eventSourceRef.current?.readyState,
          timestamp: new Date().toISOString()
        });
        setIsConnected(true);
        setConnectionError(null);
        setReconnectAttempts(0);
        // Reset circuit breaker on successful connection
        setCircuitBreakerOpen(false);
        failureCountRef.current = 0;
        lastFailureTimeRef.current = null;
        // Reset health check state on successful connection
        healthCheckAttemptsRef.current = 0;
        healthCheckCurrentIntervalRef.current = null;
        healthCheckStartTimeRef.current = null;
        // Clear any pending health check schedule timeout
        if (healthCheckScheduleTimeoutRef.current) {
          clearTimeout(healthCheckScheduleTimeoutRef.current);
          healthCheckScheduleTimeoutRef.current = null;
        }
        onConnectRef.current?.();
        // Process any queued messages now that we're connected
        processQueue();
      };

      eventSourceRef.current.onmessage = (event) => {
        try {
          // CRITICAL: If we receive ANY message, the connection is definitely open
          // Some browsers don't fire onopen reliably, so treat first message as connection
          if (!isConnectedRef.current) {
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
            isConnectingRef.current = false;
            console.log('✅ SSE connection confirmed by receiving first message (onopen may not have fired)');
            setIsConnected(true);
            setConnectionError(null);
            setReconnectAttempts(0);
            // Reset circuit breaker on successful connection
            setCircuitBreakerOpen(false);
            failureCountRef.current = 0;
            lastFailureTimeRef.current = null;
            // Reset health check state on successful connection
            healthCheckAttemptsRef.current = 0;
            healthCheckCurrentIntervalRef.current = null;
            healthCheckStartTimeRef.current = null;
            // Clear any pending health check schedule timeout
            if (healthCheckScheduleTimeoutRef.current) {
              clearTimeout(healthCheckScheduleTimeoutRef.current);
              healthCheckScheduleTimeoutRef.current = null;
            }
            onConnectRef.current?.();
            // Process any queued messages now that we're connected
            processQueue();
          }

          // SAFETY: Validate JSON before parsing
          let message: SSEMessage;
          try {
            message = JSON.parse(event.data);
          } catch (parseError) {
            console.error('❌ Invalid SSE message format:', event.data);
            return; // Don't crash, just ignore malformed messages
          }

          // SAFETY: Validate message structure
          if (!message || typeof message !== 'object' || !message.type) {
            console.error('❌ Invalid SSE message structure:', message);
            return;
          }
          
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
          console.error('❌ Error processing SSE message:', error, 'Raw data:', event.data);
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
        
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        // If connection is closed, it means connection failed
        if (readyState === EventSource.CLOSED) {
          isConnectingRef.current = false;
          const error = new NetworkError('SSE connection closed/failed');
          console.error('❌ SSE connection failed - readyState is CLOSED');
          setConnectionError(error.message);
          setIsConnected(false);
          handleError(error, 'useSSE.onerror');
          onErrorRef.current?.(error);

          // Circuit breaker and exponential backoff logic
          failureCountRef.current += 1;
          lastFailureTimeRef.current = Date.now();

          if (failureCountRef.current >= CIRCUIT_BREAKER_THRESHOLD) {
            setCircuitBreakerOpen(true);
            console.warn(`🔴 Circuit breaker opened after ${failureCountRef.current} failures - stopping reconnection attempts`);
            // Start periodic health checks when circuit breaker opens
            // Note: This will be handled by the useEffect that watches circuitBreakerOpen
            return; // Don't attempt reconnection
          }

          // Check if we should attempt reconnection
          if (shouldReconnectRef.current && reconnectAttempts < maxReconnectAttempts) {
            const delay = calculateReconnectDelay(reconnectAttempts);
            console.log(`⏳ Scheduling reconnection attempt ${reconnectAttempts + 1}/${maxReconnectAttempts} in ${delay}ms`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              // Use ref to check current state (avoids stale closure)
              if (shouldReconnectRef.current && !circuitBreakerOpenRef.current) {
                setReconnectAttempts(prev => prev + 1);
                connect();
              }
            }, delay);
          } else {
            console.warn('⚠️ Max reconnection attempts reached or reconnection disabled');
          }
        } else if (readyState === EventSource.CONNECTING) {
          // Still connecting - this might be a temporary error
          console.warn('⚠️ SSE error while CONNECTING - may retry');
        }
      };

    } catch (error) {
      console.error('❌ Failed to create EventSource:', error);
      isConnectingRef.current = false; // Reset connecting state to prevent stuck state
      const networkError = new NetworkError('Nepodařilo se vytvořit SSE připojení');
      setConnectionError(networkError.message);
      handleError(networkError, 'useSSE.connect');
    }
  }, [enabled, sseUrl, handleError, processQueue]);

  // Stop health check interval (works with both setTimeout and setInterval)
  const stopHealthCheckInterval = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      clearTimeout(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
    if (healthCheckScheduleTimeoutRef.current) {
      clearTimeout(healthCheckScheduleTimeoutRef.current);
      healthCheckScheduleTimeoutRef.current = null;
    }
    // Reset timer when stopping health checks
    healthCheckStartTimeRef.current = null;
    console.log('🛑 Stopped periodic health checks');
  }, []);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    isConnectingRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    stopHealthCheckInterval();
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionError(null);
  }, [stopHealthCheckInterval]);

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

  // Periodic health check when circuit breaker is open with exponential backoff
  const startHealthCheckInterval = useCallback(() => {
    // Clear any existing health check interval
    stopHealthCheckInterval();

    // Only start if circuit breaker is open and enabled
    // Check state directly here (ref will be updated by useEffect)
    if (!circuitBreakerOpen || !enabled || !shouldReconnectRef.current) {
      return;
    }

    // Record start time when circuit breaker opens
    if (healthCheckStartTimeRef.current === null) {
      healthCheckStartTimeRef.current = Date.now();
      const maxHours = HEALTH_CHECK_MAX_TOTAL_TIME / (60 * 60 * 1000);
      console.log(`⏱️ Health check timer started - will stop after ${maxHours} hours total`);
    }

    // Reset health check attempts when starting (circuit breaker just opened)
    healthCheckAttemptsRef.current = 0;
    healthCheckCurrentIntervalRef.current = null;

    // Recursive function to schedule health checks with exponential backoff
    const scheduleNextHealthCheck = () => {
      // Check if we've exceeded max attempts
      if (healthCheckAttemptsRef.current >= HEALTH_CHECK_MAX_ATTEMPTS) {
        console.error(`🛑 Hard stop: Maximum health check attempts (${HEALTH_CHECK_MAX_ATTEMPTS}) reached - stopping all reconnection attempts`);
        shouldReconnectRef.current = false;
        stopHealthCheckInterval();
        healthCheckStartTimeRef.current = null;
        return;
      }

      // Check if we've exceeded maximum total time
      if (healthCheckStartTimeRef.current !== null) {
        const elapsedTime = Date.now() - healthCheckStartTimeRef.current;
        if (elapsedTime >= HEALTH_CHECK_MAX_TOTAL_TIME) {
          const elapsedHours = (elapsedTime / (60 * 60 * 1000)).toFixed(1);
          const maxHours = (HEALTH_CHECK_MAX_TOTAL_TIME / (60 * 60 * 1000)).toFixed(1);
          console.error(`🛑 Hard stop: Maximum total health check time (${maxHours} hours) reached after ${elapsedHours}h - stopping all reconnection attempts to preserve battery`);
          shouldReconnectRef.current = false;
          stopHealthCheckInterval();
          healthCheckStartTimeRef.current = null;
          return;
        }
      }

      // Check if circuit breaker is still open (might have been reset by successful connection)
      if (!circuitBreakerOpenRef.current || !enabledRef.current || !shouldReconnectRef.current) {
        stopHealthCheckInterval();
        healthCheckStartTimeRef.current = null;
        return;
      }

      // Calculate interval with exponential backoff based on current attempt count
      const currentInterval = calculateHealthCheckInterval(healthCheckAttemptsRef.current);
      healthCheckCurrentIntervalRef.current = currentInterval;

      const intervalSeconds = currentInterval / 1000;
      const maxIntervalMinutes = HEALTH_CHECK_MAX_INTERVAL / 60000;
      const elapsedTime = healthCheckStartTimeRef.current !== null 
        ? Date.now() - healthCheckStartTimeRef.current 
        : 0;
      const elapsedMinutes = Math.floor(elapsedTime / 60000);
      const remainingTime = HEALTH_CHECK_MAX_TOTAL_TIME - elapsedTime;
      const remainingMinutes = Math.floor(remainingTime / 60000);
      
      console.log(`🏥 Scheduling health check ${healthCheckAttemptsRef.current + 1}/${HEALTH_CHECK_MAX_ATTEMPTS} in ${intervalSeconds}s (max interval: ${maxIntervalMinutes}min, elapsed: ${elapsedMinutes}min, remaining: ${remainingMinutes}min)`);

      // Use setTimeout instead of setInterval to allow dynamic interval changes
      healthCheckIntervalRef.current = setTimeout(() => {
        // Check again before attempting (state might have changed)
        if (!circuitBreakerOpenRef.current || !enabledRef.current || !shouldReconnectRef.current) {
          stopHealthCheckInterval();
          healthCheckStartTimeRef.current = null;
          return;
        }

        // Increment attempt counter before attempting
        healthCheckAttemptsRef.current += 1;

        // Attempt a health check connection
        console.log(`🏥 Performing health check attempt ${healthCheckAttemptsRef.current}/${HEALTH_CHECK_MAX_ATTEMPTS}...`);
        
        // Call connect() - if successful, onopen handler will reset circuit breaker and health check state
        // If it fails, onerror will handle it, and we'll schedule the next check with increased interval
        connect();

        // Clear any existing schedule timeout before creating a new one
        if (healthCheckScheduleTimeoutRef.current) {
          clearTimeout(healthCheckScheduleTimeoutRef.current);
          healthCheckScheduleTimeoutRef.current = null;
        }

        // Schedule next health check after a short delay to allow connection attempt to complete
        // If connection succeeds, circuit breaker will be closed and we won't schedule another check
        // If connection fails, we'll continue with the next attempt
        healthCheckScheduleTimeoutRef.current = setTimeout(() => {
          // Clear the ref since timeout has fired
          healthCheckScheduleTimeoutRef.current = null;
          // Only schedule next check if circuit breaker is still open (connection failed)
          if (circuitBreakerOpenRef.current && enabledRef.current && shouldReconnectRef.current) {
            scheduleNextHealthCheck();
          }
        }, 2000); // Wait 2 seconds for connection attempt to complete/fail
      }, currentInterval);
    };

    // Start the first health check immediately (or with initial interval)
    scheduleNextHealthCheck();
  }, [circuitBreakerOpen, enabled, connect, stopHealthCheckInterval, calculateHealthCheckInterval, HEALTH_CHECK_MAX_ATTEMPTS, HEALTH_CHECK_MAX_INTERVAL, HEALTH_CHECK_MAX_TOTAL_TIME]);

  // Effect to manage health check interval based on circuit breaker state
  // NOTE: Removed automatic circuit breaker reset effect - health checks handle recovery
  // When backend comes back, health check succeeds and onopen handler resets circuit breaker
  useEffect(() => {
    // Check state directly (ref is updated by separate useEffect)
    if (circuitBreakerOpen && enabled && shouldReconnectRef.current) {
      startHealthCheckInterval();
    } else {
      stopHealthCheckInterval();
    }

    return () => {
      stopHealthCheckInterval();
    };
  }, [circuitBreakerOpen, enabled, startHealthCheckInterval, stopHealthCheckInterval]);

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
      
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      stopHealthCheckInterval();
      
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
    circuitBreakerOpen,
    connect,
    disconnect,
    reconnect,
    sendMessage
  };
}
