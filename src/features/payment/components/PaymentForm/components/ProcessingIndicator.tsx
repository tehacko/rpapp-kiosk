import styles from '../PaymentForm.module.css';

interface ProcessingIndicatorProps {
  isGeneratingQR: boolean;
}

export function ProcessingIndicator({ isGeneratingQR }: ProcessingIndicatorProps): JSX.Element {
  return (
    <div className={styles.stepContent}>
      <div className={styles.processingMessage}>
        {isGeneratingQR ? (
          <>
            <div className={styles.processingSpinner} aria-hidden="true" />
            <div>Generuji QR kód...</div>
          </>
        ) : (
          <div>Zpracovávám platbu...</div>
        )}
      </div>
    </div>
  );
}
