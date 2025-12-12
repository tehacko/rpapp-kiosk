import { useState, useCallback, useEffect } from 'react';

export function useFullscreen(): { isFullscreen: boolean; toggleFullscreen: () => void } {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback((): void => {
    try {
      if (!document.fullscreenElement) {
        void document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          void document.exitFullscreen();
        }
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  }, []);

  // Removed auto-enter fullscreen behavior - fullscreen should only be toggled via the FullscreenButton

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = (): void => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return (): void => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return { 
    isFullscreen, 
    toggleFullscreen 
  };
}
