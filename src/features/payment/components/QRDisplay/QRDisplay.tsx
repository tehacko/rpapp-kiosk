// React import not needed with new JSX transform
import { useState, useEffect, useRef, useCallback } from 'react';
import { PaymentData, MultiProductPaymentData, CSS_CLASSES, formatPrice } from 'pi-kiosk-shared';
import styles from './QRDisplay.module.css';

interface QRDisplayProps {
  qrCodeUrl: string;
  paymentData?: PaymentData | MultiProductPaymentData | { amount?: number | string };
  onCancel: () => void;
  title?: string;
  instructions?: string;
  statusText?: string;
  amount?: string | number;
  showTimer?: boolean; // Show timer for FIO payment checks
  checkInterval?: number; // Interval in seconds (default 31 for FIO)
  monitoringStartTime?: number | null; // Timestamp when monitoring started (for synchronized timer)
}

const FIO_CHECK_INTERVAL = 31; // FIO Bank requirement: 31 seconds between checks
const CHECKING_DURATION = 2; // Show "Checking..." for 2 seconds

export function QRDisplay({ 
  qrCodeUrl, 
  paymentData,
  onCancel,
  title = "Naskenujte QR kód",
  amount,
  showTimer = false,
  checkInterval = FIO_CHECK_INTERVAL,
  monitoringStartTime = null
}: QRDisplayProps) {
  // Timer state for FIO payment checks
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
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (checkingTimeoutRef.current) {
        clearTimeout(checkingTimeoutRef.current);
        checkingTimeoutRef.current = null;
      }
    };
  }, [showTimer, checkInterval, monitoringStartTime, calculateTimeUntilNextCheck]);

  // Listen for payment check started events to reset timer (perfect synchronization)
  useEffect(() => {
    if (!showTimer || !paymentData) {
      return;
    }

    const currentPaymentId = 'paymentId' in paymentData ? paymentData.paymentId : null;
    if (!currentPaymentId) {
      return;
    }

    const handleCheckStarted = (event: CustomEvent) => {
      const { paymentId, checkTime } = event.detail;
      // Only reset if this is our payment
      if (paymentId === currentPaymentId) {
        console.log('⏱️ Check started event received, resetting timer to 31s:', { paymentId, checkTime });
        // Store the check time to calculate from (event-based synchronization)
        lastCheckEventTimeRef.current = checkTime || Date.now();
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
    
    return () => {
      window.removeEventListener('payment-check-started', handleCheckStarted as EventListener);
    };
  }, [showTimer, paymentData, checkInterval]);

  // Extract amount from paymentData if not provided directly
  let displayAmount: string | undefined;
  if (amount !== undefined) {
    displayAmount = typeof amount === 'number' ? formatPrice(amount) : amount;
  } else if (paymentData) {
    if ('amount' in paymentData && paymentData.amount) {
      displayAmount = formatPrice(typeof paymentData.amount === 'number' ? paymentData.amount : parseFloat(String(paymentData.amount)));
    } else if ('totalAmount' in paymentData && paymentData.totalAmount) {
      displayAmount = formatPrice(paymentData.totalAmount);
    }
  }

  return (
    <div className={`${styles.qrSection} ${CSS_CLASSES.CARD}`}>
      {/* Left side - Text content */}
      <div className={styles.qrLeftContent}>
        <div className={styles.qrInfoPanel}>
          <h2 className={styles.qrTitle}>{title}</h2>
          {displayAmount && (
            <p className={styles.amountText}>{displayAmount}</p>
          )}
          {showTimer && (
            <div className={styles.timerContainer}>
              {isChecking ? (
                <p className={styles.checkingText}>Kontroluji...</p>
              ) : (
                <p className={styles.timerText}>Další kontrola platby za {timeUntilNextCheck} s</p>
              )}
            </div>
          )}
        </div>
        
        <div className={styles.qrActions}>
          <button
            onClick={onCancel}
            className={styles.cancelQrBtn}
            type="button"
            aria-label="Zpět"
          >
            ← Zpět
          </button>
        </div>
      </div>
      
      {/* Right side - QR Code */}
      <div className={styles.qrRightContent}>
        <img 
          src={qrCodeUrl} 
          alt="QR Code pro platbu" 
          className={styles.qrCode}
          loading="lazy"
        />
      </div>
    </div>
  );
}
