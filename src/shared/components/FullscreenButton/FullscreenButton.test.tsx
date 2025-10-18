import { render, screen } from '@testing-library/react';
import { FullscreenButton } from './FullscreenButton';

// Mock the useFullscreen hook
jest.mock('../../../features/kiosk/hooks/useFullscreen', () => ({
  useFullscreen: jest.fn(() => ({
    toggleFullscreen: jest.fn(),
  })),
}));

import { useFullscreen } from '../../../features/kiosk/hooks/useFullscreen';

const mockUseFullscreen = useFullscreen as jest.MockedFunction<typeof useFullscreen>;

describe('FullscreenButton', () => {
  it('renders fullscreen button', () => {
    const mockToggleFullscreen = jest.fn();
    mockUseFullscreen.mockReturnValue({
      isFullscreen: false,
      toggleFullscreen: mockToggleFullscreen,
    });

    render(<FullscreenButton />);

    expect(screen.getByText('📺 Celá obrazovka')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('title', 'Přepnout na celou obrazovku');
  });

  it('calls toggleFullscreen when clicked', () => {
    const mockToggleFullscreen = jest.fn();
    mockUseFullscreen.mockReturnValue({
      isFullscreen: false,
      toggleFullscreen: mockToggleFullscreen,
    });

    render(<FullscreenButton />);

    screen.getByText('📺 Celá obrazovka').click();
    expect(mockToggleFullscreen).toHaveBeenCalledTimes(1);
  });
});
