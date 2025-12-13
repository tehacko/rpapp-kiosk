/**
 * Message Queue Hook
 * Handles offline message queuing with localStorage persistence
 */
import { useRef, useEffect, useCallback } from 'react';
import type { SSEMessage } from './useServerSentEvents';

interface UseMessageQueueOptions {
  onMessage: (message: SSEMessage) => void;
  storageKey?: string;
  maxQueueSize?: number;
}

interface UseMessageQueueReturn {
  enqueue: (message: SSEMessage) => void;
  processQueue: () => void;
  clearQueue: () => void;
  queueLength: number;
}

const DEFAULT_STORAGE_KEY = 'sse-message-queue';
const DEFAULT_MAX_QUEUE_SIZE = 100;

export function useMessageQueue({
  onMessage,
  storageKey = DEFAULT_STORAGE_KEY,
  maxQueueSize = DEFAULT_MAX_QUEUE_SIZE,
}: UseMessageQueueOptions): UseMessageQueueReturn {
  const queueRef = useRef<SSEMessage[]>([]);
  const isProcessingRef = useRef(false);
  const onMessageRef = useRef(onMessage);

  // Update ref when callback changes
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // Load queue from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          queueRef.current = parsed;
          console.info(
            `📦 Loaded ${parsed.length} messages from offline queue`
          );
        }
      }
    } catch (error) {
      console.error('❌ Error loading message queue from localStorage:', error);
    }
  }, [storageKey]);

  // Save queue to localStorage whenever it changes
  const saveQueue = useCallback(() => {
    try {
      if (queueRef.current.length > 0) {
        localStorage.setItem(
          storageKey,
          JSON.stringify(queueRef.current)
        );
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.error('❌ Error saving message queue to localStorage:', error);
    }
  }, [storageKey]);

  // Process queue - handle messages one at a time
  const processQueue = useCallback(() => {
    if (isProcessingRef.current || queueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;

    try {
      while (queueRef.current.length > 0) {
        const msg = queueRef.current.shift();
        if (msg) {
          onMessageRef.current(msg);
        }
      }
      saveQueue();
    } catch (error) {
      console.error('❌ Error processing message queue:', error);
    } finally {
      isProcessingRef.current = false;
    }
  }, [saveQueue]);

  // Enqueue message
  const enqueue = useCallback(
    (message: SSEMessage) => {
      // Prevent queue overflow
      if (queueRef.current.length >= maxQueueSize) {
        console.warn(
          `⚠️ Message queue full (${maxQueueSize}), dropping oldest message`
        );
        queueRef.current.shift();
      }

      queueRef.current.push({
        ...message,
        timestamp: message.timestamp ?? new Date().toISOString(),
      });

      saveQueue();

      // Try to process immediately if not already processing
      if (!isProcessingRef.current) {
        processQueue();
      }
    },
    [maxQueueSize, saveQueue, processQueue]
  );

  // Clear queue
  const clearQueue = useCallback((): void => {
    queueRef.current = [];
    saveQueue();
  }, [saveQueue]);

  // Process queue when online
  useEffect(() => {
    const handleOnline = (): void => {
      console.info('🌐 Connection restored, processing queued messages...');
      processQueue();
    };

    window.addEventListener('online', handleOnline);

    // Process queue on mount if online
    if (navigator.onLine && queueRef.current.length > 0) {
      processQueue();
    }

    return (): void => {
      window.removeEventListener('online', handleOnline);
    };
  }, [processQueue]);

  return {
    enqueue,
    processQueue,
    clearQueue,
    queueLength: queueRef.current.length,
  };
}

