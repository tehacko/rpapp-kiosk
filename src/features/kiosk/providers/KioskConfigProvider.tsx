import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getKioskIdFromUrl, validateKioskId, getKioskSecretFromUrl } from 'pi-kiosk-shared';

interface KioskConfigContextType {
  kioskId: number | null;
  kioskSecret: string | null;
  isValid: boolean;
  error: string | null;
}

const KioskConfigContext = createContext<KioskConfigContextType | undefined>(undefined);

interface KioskConfigProviderProps {
  children: ReactNode;
}

export function KioskConfigProvider({ children }: KioskConfigProviderProps): JSX.Element {
  const [kioskId, setKioskId] = useState<number | null>(null);
  const [kioskSecret, setKioskSecret] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect((): void => {
    try {
      const id = getKioskIdFromUrl();
      const secret = getKioskSecretFromUrl();

      if (!validateKioskId(id)) {
        throw new Error(`Invalid kiosk ID: ${id}. Kiosk ID must be a positive number.`);
      }

      setKioskId(id);
      setKioskSecret(secret ?? null);
      setIsValid(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize kiosk configuration');
      setIsValid(false);
      setKioskId(null);
      setKioskSecret(null);
    }
  }, []);

  const value = { kioskId, kioskSecret, isValid, error };

  return (
    <KioskConfigContext.Provider value={value} data-testid="kiosk-config-provider">
      {children}
    </KioskConfigContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useKioskConfig(): KioskConfigContextType {
  const context = useContext(KioskConfigContext);
  if (context === undefined) {
    throw new Error('useKioskConfig must be used within a KioskConfigProvider');
  }
  return context;
}
