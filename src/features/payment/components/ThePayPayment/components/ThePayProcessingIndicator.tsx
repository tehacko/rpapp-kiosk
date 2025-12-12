import styles from '../ThePayPayment.module.css';

interface ThePayProcessingIndicatorProps {
  message: string;
}

export function ThePayProcessingIndicator({ message }: ThePayProcessingIndicatorProps): JSX.Element {
  return (
    <div className={styles.processingContainer}>
      <div className={styles.processingMessage}>
        <div className={styles.processingSpinner} aria-hidden="true" />
        <p>{message}</p>
      </div>
    </div>
  );
}
