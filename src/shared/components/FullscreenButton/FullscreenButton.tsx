import { FC } from 'react';
import { useFullscreen } from '../../../features/kiosk/hooks/useFullscreen';

export const FullscreenButton: FC = () => {
  const { toggleFullscreen } = useFullscreen();

  return (
    <button
      onClick={toggleFullscreen}
      className="fullscreen-btn-bottom"
      type="button"
      title="Přepnout na celou obrazovku"
    >
      📺 Celá obrazovka
    </button>
  );
};
