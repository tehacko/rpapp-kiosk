import { useFullscreen } from '../../../features/kiosk/hooks/useFullscreen';
import styles from './FullscreenButton.module.css';

export function FullscreenButton(): JSX.Element {
  const { toggleFullscreen } = useFullscreen();

  return (
    <button
      onClick={toggleFullscreen}
      className={styles.fullscreenBtnBottom}
      type="button"
      title="Přepnout na celou obrazovku"
    >
      📺 Celá obrazovka
    </button>
  );
};
