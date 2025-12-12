import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  message?: string;
  fullHeight?: boolean;
}

export function LoadingSpinner({ message = 'Načítám...', fullHeight = true }: LoadingSpinnerProps): JSX.Element {
  return (
    <div
      className={`${styles.container} ${fullHeight ? styles.fullHeight : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className={styles.spinner} />
      {message ? <p className={styles.message}>{message}</p> : null}
    </div>
  );
}
