import styles from '../ProductsScreen.module.css';

interface PaymentUnavailableBannerProps {
  show: boolean;
}

export function PaymentUnavailableBanner({ show }: PaymentUnavailableBannerProps): JSX.Element | null {
  if (!show) {
    return null;
  }

  return (
    <div className={styles.paymentUnavailableBanner} role="alert">
      <span className={styles.bannerIcon} aria-hidden="true">⚠️</span>
      <span className={styles.bannerText}>
        Platby jsou dočasně nedostupné. Zkuste to prosím později.
      </span>
    </div>
  );
}
