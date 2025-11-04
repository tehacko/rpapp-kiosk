import { FC } from 'react';
import { useFullscreen } from '../../../features/kiosk/hooks/useFullscreen';
import styles from './FullscreenButton.module.css';

export const FullscreenButton: FC = () => {
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
