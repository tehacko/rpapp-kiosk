import { render, screen } from '@testing-library/react';
import { KioskConfigProvider, useKioskConfig } from './KioskConfigProvider';

// Mock the shared functions
jest.mock('pi-kiosk-shared', () => ({
  getKioskIdFromUrl: jest.fn(),
  validateKioskId: jest.fn(),
  getKioskSecretFromUrl: jest.fn(),
}));

import { getKioskIdFromUrl, validateKioskId, getKioskSecretFromUrl } from 'pi-kiosk-shared';

const mockGetKioskIdFromUrl = getKioskIdFromUrl as jest.MockedFunction<typeof getKioskIdFromUrl>;
const mockValidateKioskId = validateKioskId as jest.MockedFunction<typeof validateKioskId>;
const mockGetKioskSecretFromUrl = getKioskSecretFromUrl as jest.MockedFunction<typeof getKioskSecretFromUrl>;

// Test component that uses the hook
const TestComponent = () => {
  const { kioskId, kioskSecret, isValid, error } = useKioskConfig();
  return (
    <div>
      <div data-testid="kiosk-id">{kioskId}</div>
      <div data-testid="kiosk-secret">{kioskSecret}</div>
      <div data-testid="is-valid">{isValid.toString()}</div>
      <div data-testid="error">{error}</div>
    </div>
  );
};

describe('KioskConfigProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides valid kiosk configuration when URL is valid', () => {
    mockGetKioskIdFromUrl.mockReturnValue(1);
    mockValidateKioskId.mockReturnValue(true);
    mockGetKioskSecretFromUrl.mockReturnValue('test-secret');

    render(
      <KioskConfigProvider>
        <TestComponent />
      </KioskConfigProvider>
    );

    expect(screen.getByTestId('kiosk-id')).toHaveTextContent('1');
    expect(screen.getByTestId('kiosk-secret')).toHaveTextContent('test-secret');
    expect(screen.getByTestId('is-valid')).toHaveTextContent('true');
    expect(screen.getByTestId('error')).toHaveTextContent('');
  });

  it('provides error when kiosk ID is invalid', () => {
    mockGetKioskIdFromUrl.mockReturnValue(-1);
    mockValidateKioskId.mockReturnValue(false);
    mockGetKioskSecretFromUrl.mockReturnValue('test-secret');

    render(
      <KioskConfigProvider>
        <TestComponent />
      </KioskConfigProvider>
    );

    expect(screen.getByTestId('kiosk-id')).toHaveTextContent('');
    expect(screen.getByTestId('kiosk-secret')).toHaveTextContent('');
    expect(screen.getByTestId('is-valid')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('Invalid kiosk ID: -1. Kiosk ID must be a positive number.');
  });

  it('provides error when validation throws', () => {
    mockGetKioskIdFromUrl.mockImplementation(() => {
      throw new Error('URL parsing failed');
    });

    render(
      <KioskConfigProvider>
        <TestComponent />
      </KioskConfigProvider>
    );

    expect(screen.getByTestId('kiosk-id')).toHaveTextContent('');
    expect(screen.getByTestId('kiosk-secret')).toHaveTextContent('');
    expect(screen.getByTestId('is-valid')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('URL parsing failed');
  });

  it('throws error when useKioskConfig is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useKioskConfig must be used within a KioskConfigProvider');

    consoleSpy.mockRestore();
  });
});
