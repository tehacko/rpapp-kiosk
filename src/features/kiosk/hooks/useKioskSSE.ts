import { useCallback } from 'react';
import { useServerSentEvents } from '../../realtime';
import type { KioskMessage } from '../utils/kioskMessageHandlers';

interface UseKioskSSEOptions {
  kioskId: number;
  enabled: boolean;
  onMessage: (message: KioskMessage) => void;
  onConnect?: () => void;
  onError?: (error: Error) => void;
}

export function useKioskSSE({
  kioskId,
  enabled,
  onMessage,
  onConnect,
  onError,
}: UseKioskSSEOptions): ReturnType<typeof useServerSentEvents> {
  const handleMessage = useCallback((message: unknown) => {
    onMessage(message as KioskMessage);
  }, [onMessage]);

  return useServerSentEvents({
    kioskId,
    enabled,
    onMessage: handleMessage,
    onConnect,
    onError,
  });
}
