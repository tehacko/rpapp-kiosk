import { UI_MESSAGES, CSS_CLASSES } from 'pi-kiosk-shared';
import styles from '../PaymentForm.module.css';

interface EmailInputFormProps {
  email: string;
  error?: string;
  onEmailChange: (email: string) => void;
  onErrorClear?: () => void;
}

export function EmailInputForm({ 
  email, 
  error, 
  onEmailChange,
  onErrorClear 
}: EmailInputFormProps): JSX.Element {
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    onEmailChange(value);

    if (error && onErrorClear) {
      onErrorClear();
    }
  };

  const handleEmailSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    // This form submission is now handled by the header button
  };

  return (
    <div className={styles.stepContent}>
      <form className={styles.paymentForm} onSubmit={handleEmailSubmit} noValidate>
        <div className={styles.formGroup}>
          <label htmlFor="customer-email" className={styles.formLabel}>
            {UI_MESSAGES.EMAIL_LABEL}
            <span className="required-indicator" aria-label="Required">*</span>
          </label>
          <input
            type="email"
            id="customer-email"
            name="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="vas@email.cz"
            required
            aria-required="true"
            aria-invalid={!!error}
            aria-describedby={error ? "email-error" : undefined}
            className={`${CSS_CLASSES.INPUT} ${styles.emailInput} ${error ? CSS_CLASSES.ERROR : ''}`}
            autoComplete="email"
          />
          {error && (
            <span 
              id="email-error" 
              className={styles.errorMessage} 
              role="alert"
              aria-live="polite"
            >
              {error}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
