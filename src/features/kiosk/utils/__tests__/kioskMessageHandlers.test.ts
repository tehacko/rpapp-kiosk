import { createKioskMessageHandler } from '../kioskMessageHandlers';
import { TransactionStatus } from 'pi-kiosk-shared';

jest.mock('pi-kiosk-shared', () => ({
  TransactionStatus: {
    COMPLETED: 'COMPLETED',
    TIMEOUT: 'TIMEOUT',
    FAILED: 'FAILED',
  },
}));

describe('kioskMessageHandlers', () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  const baseDeps = {
    kioskId: 1,
    email: 'a@b.c',
    qrCodeUrl: 'url',
    cartItems: [],
    paymentData: null,
    goToConfirmation: jest.fn(),
    clearQR: jest.fn(),
    setPaymentStep: jest.fn(),
    setSelectedPaymentMethod: jest.fn(),
  };

  it('redirects on kiosk_deleted', () => {
    delete (window as any).location;
    (window as any).location = { href: '' };

    const handler = createKioskMessageHandler(baseDeps);
    handler({ type: 'kiosk_deleted', data: { kioskId: 1 } });
    expect(window.location.href).toContain('kiosk_deleted');
  });

  it('navigates to confirmation on payment_completed (non-thepay)', () => {
    const handler = createKioskMessageHandler(baseDeps);
    handler({
      type: 'product_update',
      updateType: 'payment_completed',
      data: { paymentId: 'fio-1', amount: 100 },
    });
    expect(baseDeps.goToConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ status: TransactionStatus.COMPLETED })
    );
    expect(baseDeps.setPaymentStep).toHaveBeenCalledWith(1);
    expect(baseDeps.setSelectedPaymentMethod).toHaveBeenCalledWith(undefined);
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });
});
