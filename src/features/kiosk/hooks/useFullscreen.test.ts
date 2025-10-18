import { renderHook, act } from '@testing-library/react';
import { useFullscreen } from './useFullscreen';

// Mock document methods
const mockRequestFullscreen = jest.fn();
const mockExitFullscreen = jest.fn();

Object.defineProperty(document.documentElement, 'requestFullscreen', {
  value: mockRequestFullscreen,
  writable: true,
});

Object.defineProperty(document, 'exitFullscreen', {
  value: mockExitFullscreen,
  writable: true,
});

Object.defineProperty(document, 'fullscreenElement', {
  value: null,
  writable: true,
});

describe('useFullscreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true,
      configurable: true,
    });
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useFullscreen());

    expect(result.current.isFullscreen).toBe(false);
    expect(typeof result.current.toggleFullscreen).toBe('function');
  });

  it('calls requestFullscreen when not in fullscreen', () => {
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => useFullscreen());

    act(() => {
      result.current.toggleFullscreen();
    });

    // The hook calls requestFullscreen both on mount and when toggleFullscreen is called
    expect(mockRequestFullscreen).toHaveBeenCalledTimes(3);
  });

  it('calls exitFullscreen when in fullscreen', () => {
    Object.defineProperty(document, 'fullscreenElement', {
      value: document.documentElement,
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => useFullscreen());

    act(() => {
      result.current.toggleFullscreen();
    });

    expect(mockExitFullscreen).toHaveBeenCalledTimes(1);
  });

  it('handles requestFullscreen errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRequestFullscreen.mockImplementation(() => {
      throw new Error('Fullscreen not supported');
    });

    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => useFullscreen());

    act(() => {
      result.current.toggleFullscreen();
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Fullscreen toggle failed:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('handles exitFullscreen errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockExitFullscreen.mockImplementation(() => {
      throw new Error('Exit fullscreen failed');
    });

    Object.defineProperty(document, 'fullscreenElement', {
      value: document.documentElement,
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => useFullscreen());

    act(() => {
      result.current.toggleFullscreen();
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Fullscreen toggle failed:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('updates isFullscreen state when fullscreen changes', () => {
    const { result } = renderHook(() => useFullscreen());

    expect(result.current.isFullscreen).toBe(false);

    // Simulate entering fullscreen
    act(() => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: document.documentElement,
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    expect(result.current.isFullscreen).toBe(true);

    // Simulate exiting fullscreen
    act(() => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    expect(result.current.isFullscreen).toBe(false);
  });

  it('attempts to enter fullscreen on mount', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockRequestFullscreen.mockResolvedValue(undefined);

    renderHook(() => useFullscreen());

    // Wait for the effect to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // The hook calls requestFullscreen on mount
    expect(mockRequestFullscreen).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
  });

  it('handles auto-enter fullscreen errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockRequestFullscreen.mockRejectedValue(new Error('Auto-enter failed'));

    renderHook(() => useFullscreen());

    // Wait for the effect to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Could not enter fullscreen:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useFullscreen());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'fullscreenchange',
      expect.any(Function)
    );

    removeEventListenerSpy.mockRestore();
  });
});
