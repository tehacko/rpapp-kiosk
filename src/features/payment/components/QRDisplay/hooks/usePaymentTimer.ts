import { useState, useEffect, useRef, useCallback } from 'react';

const FIO_CHECK_INTERVAL = 31; // FIO Bank requirement: 31 seconds between checks
const CHECKING_DURATION = 2; // Show "Checking..." for 2 seconds

export interface UsePaymentTimerDeps {
  showTimer: boolean;
  checkInterval?: number;
  monitoringStartTime: number | null;
  paymentId?: string | null;
}

export interface UsePaymentTimerResult {
  timeUntilNextCheck: number;
  isChecking: boolean;
}

export function usePaymentTimer({
  showTimer,
  checkInterval = FIO_CHECK_INTERVAL,
  monitoringStartTime,
  paymentId
}: UsePaymentTimerDeps): UsePaymentTimerResult {
  const [timeUntilNextCheck, setTimeUntilNextCheck] = useState<number>(checkInterval);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckEventTimeRef = useRef<number | null>(null); // Track when last check event was received

  // Calculate time until next check based on monitoring start time
  const calculateTimeUntilNextCheck = useCallback((startTime: number | null): number => {
    if (!startTime) {
      // Fallback: use simple countdown if no start time provided
      return checkInterval;
    }
    
    const now = Date.now();
    const elapsed = now - startTime;
    const intervalMs = checkInterval * 1000;
    
    // Calculate time until the next check
    const timeUntilNext = intervalMs - (elapsed % intervalMs);
    
    // Convert to seconds and round up
    return Math.ceil(timeUntilNext / 1000);
  }, [checkInterval]);

  // Timer countdown effect
  useEffect(() => {
    if (!showTimer) {
      return;
    }

    // Initialize timer based on monitoring start time
    if (monitoringStartTime) {
      const initialTime = calculateTimeUntilNextCheck(monitoringStartTime);
      setTimeUntilNextCheck(initialTime);
    }

    // Start countdown timer
    timerIntervalRef.current = setInterval(() => {
      // Priority 1: If we received a check event, calculate from that time (most accurate)
      if (lastCheckEventTimeRef.current) {
        const now = Date.now();
        const elapsedSinceLastCheck = now - lastCheckEventTimeRef.current;
        const timeUntilNext = checkInterval * 1000 - elapsedSinceLastCheck;
        const secondsUntilNext = Math.max(0, Math.ceil(timeUntilNext / 1000));
        
        setTimeUntilNextCheck(secondsUntilNext);
        
        // Show checking state when timer reaches 0
        if (secondsUntilNext <= 1 && !isChecking) {
          setIsChecking(true);
          if (checkingTimeoutRef.current) {
            clearTimeout(checkingTimeoutRef.current);
          }
          checkingTimeoutRef.current = setTimeout(() => {
            setIsChecking(false);
          }, CHECKING_DURATION * 1000);
        }
        return;
      }
      
      // Priority 2: Calculate from monitoring start time (fallback if events not received yet)
      if (monitoringStartTime) {
        const calculatedTime = calculateTimeUntilNextCheck(monitoringStartTime);
        setTimeUntilNextCheck((prev) => {
          // Only update if the calculated time is different (to avoid unnecessary re-renders)
          if (Math.abs(calculatedTime - prev) > 1) {
            return calculatedTime;
          }
          
          // When timer reaches 0 or very close, show checking state
          if (calculatedTime <= 1) {
            setIsChecking(true);
            
            // After CHECKING_DURATION seconds, hide checking state
            if (checkingTimeoutRef.current) {
              clearTimeout(checkingTimeoutRef.current);
            }
            checkingTimeoutRef.current = setTimeout(() => {
              setIsChecking(false);
            }, CHECKING_DURATION * 1000);
          }
          
          return calculatedTime;
        });
      } else {
        // Priority 3: Simple countdown (fallback if no start time)
        setTimeUntilNextCheck((prev) => {
          if (prev <= 1) {
            // Timer reached 0, start checking
            setIsChecking(true);
            
            // After CHECKING_DURATION seconds, restart timer
            if (checkingTimeoutRef.current) {
              clearTimeout(checkingTimeoutRef.current);
            }
            checkingTimeoutRef.current = setTimeout(() => {
              setIsChecking(false);
              setTimeUntilNextCheck(checkInterval);
            }, CHECKING_DURATION * 1000);
            
            return checkInterval;
          }
          return prev - 1;
        });
      }
    }, 1000); // Update every second

    // Cleanup
    return (): void => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (checkingTimeoutRef.current) {
        clearTimeout(checkingTimeoutRef.current);
        checkingTimeoutRef.current = null;
      }
    };
  }, [showTimer, checkInterval, monitoringStartTime, calculateTimeUntilNextCheck, isChecking]);

  // Listen for payment check started events to reset timer (perfect synchronization)
  useEffect(() => {
    if (!showTimer || !paymentId) {
      return;
    }

    const handleCheckStarted = (event: CustomEvent): void => {
      const { paymentId: eventPaymentId, checkTime } = event.detail;
      // Only reset if this is our payment
      if (eventPaymentId === paymentId) {
        console.info('⏱️ Check started event received, resetting timer to 31s:', { paymentId: eventPaymentId, checkTime });
        // Store the check time to calculate from (event-based synchronization)
        lastCheckEventTimeRef.current = checkTime ?? Date.now();
        // Reset timer to 31 seconds when check actually happens
        setTimeUntilNextCheck(checkInterval);
        setIsChecking(true);
        
        // Hide checking state after CHECKING_DURATION
        if (checkingTimeoutRef.current) {
          clearTimeout(checkingTimeoutRef.current);
        }
        checkingTimeoutRef.current = setTimeout(() => {
          setIsChecking(false);
        }, CHECKING_DURATION * 1000);
      }
    };

    window.addEventListener('payment-check-started', handleCheckStarted as EventListener);
    
    return (): void => {
      window.removeEventListener('payment-check-started', handleCheckStarted as EventListener);
    };
  }, [showTimer, paymentId, checkInterval]);

  return {
    timeUntilNextCheck,
    isChecking
  };
}
