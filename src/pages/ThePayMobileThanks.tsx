import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './ThePayMobileThanks.css';

export function ThePayMobileThanks() {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('paymentId');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Optional: Countdown to auto-close attempt
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Try to close window (will only work if opened via window.open)
      window.close();
    }
  }, [countdown]);

  return (
    <div className="mobile-thanks-container">
      <div className="mobile-thanks-content">
        <div className="success-icon">✓</div>
        <h1>Platba úspěšná!</h1>
        <p className="main-message">
          Děkujeme za vaši platbu.
        </p>
        <p className="instruction">
          Vraťte se prosím ke kiosku pro potvrzení.
        </p>
        
        {paymentId && (
          <div className="payment-id">
            <small>ID platby: {paymentId}</small>
          </div>
        )}
        
        <div className="close-info">
          <p>Tento panel můžete zavřít.</p>
          {countdown > 0 && (
            <small>Automatické zavření za {countdown}s...</small>
          )}
        </div>
      </div>
    </div>
  );
}

