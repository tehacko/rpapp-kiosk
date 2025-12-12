import type { ReactNode } from 'react';
import styles from './ErrorScreen.module.css';

interface ErrorScreenProps {
  title: string;
  message?: string;
  instructions?: ReactNode;
  action?: ReactNode;
  icon?: string;
  fullHeight?: boolean;
  ['data-testid']?: string;
}

export function ErrorScreen({
  title,
  message,
  instructions,
  action,
  icon = '❌',
  fullHeight = true,
  'data-testid': dataTestId,
}: ErrorScreenProps): JSX.Element {
  return (
    <div
      className={`${styles.errorScreen} ${fullHeight ? styles.fullHeight : ''}`}
      data-testid={dataTestId}
      role="alert"
    >
      <div className={styles.errorContent}>
        <h1 className={styles.title}>
          {icon} {title}
        </h1>
        {message ? <p className={styles.message}>Error: {message}</p> : null}
        {instructions}
        {action}
      </div>
    </div>
  );
}
