// Kiosk app constants

export const APP_CONFIG = {
  // API Configuration
  DEFAULT_API_URL: 'http://localhost:3015',
  DEFAULT_WS_URL: 'ws://localhost:3015',
  
  // Timeouts
  API_TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  
  // WebSocket
  WS_RECONNECT_ATTEMPTS: 5,
  WS_RECONNECT_INTERVAL: 3000,
  WS_HEARTBEAT_INTERVAL: 30000,
  
  // UI
  LOADING_DEBOUNCE: 300,
  ERROR_DISPLAY_DURATION: 5000,
  
  // Validation
  MIN_USERNAME_LENGTH: 3,
  MIN_PASSWORD_LENGTH: 6,
  MAX_PRODUCT_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  
  // Business Rules
  DEFAULT_KIOSK_ID: 1,
  PAYMENT_POLLING_INTERVAL: 3000,
  PRODUCT_CACHE_TTL: 300000, // 5 minutes
  
  // Payment Configuration
  PAYMENT_ACCOUNT_NUMBER: '1234567890',
  PAYMENT_CURRENCY: 'CZK',
  QR_CODE_WIDTH: 300,
  QR_CODE_FORMAT: 'SPD*1.0', // Czech QR payment standard
} as const;

export const UI_MESSAGES = {
  // Loading states
  LOADING_PRODUCTS: 'Načítání produktů...',
  LOADING_PAYMENT: 'Zpracovávám platbu...',
  GENERATING_QR: 'Generuji QR kód...',
  PAYMENT_INITIALIZING: 'Inicializuji platbu...',
  
  // Success messages
  PAYMENT_SUCCESS: 'Platba byla úspěšně zpracována!',
  PRODUCT_SAVED: 'Produkt byl úspěšně uložen!',
  
  // Error messages
  NETWORK_ERROR: 'Problém s připojením. Zkuste to znovu.',
  VALIDATION_ERROR: 'Zkontrolujte zadané údaje.',
  UNKNOWN_ERROR: 'Něco se pokazilo. Zkuste to znovu.',
  PAYMENT_ERROR: 'Chyba při zpracování platby',
  
  // Empty states
  NO_PRODUCTS: 'Žádné produkty nejsou k dispozici',
  NO_TRANSACTIONS: 'Žádné transakce',
  COMING_SOON: 'Připravujeme pro vás...',
  
  // Form validation
  REQUIRED_FIELD: 'Toto pole je povinné',
  INVALID_EMAIL: 'Zadejte platnou emailovou adresu',
  INVALID_PRICE: 'Cena musí být větší než 0',
  EMAIL_LABEL: 'Váš email:',
  
  // Kiosk specific
  SELECT_PRODUCT: 'Vyberte si produkt',
  PAYMENT_WAITING: 'Čekám na platbu...',
  PAYMENT_CONFIRMED: 'Platba potvrzena!',
  CONTINUE_SHOPPING: 'Pokračovat v nákupu',
  BACK_TO_PRODUCTS: 'Zpět na produkty',
  
  // Action buttons
  RETRY: 'Zkusit znovu',
  CANCEL: 'Zrušit',
} as const;

export const CSS_CLASSES = {
  // Layout
  CONTAINER: 'container',
  GRID: 'grid',
  FLEX: 'flex',
  APP: 'kiosk-app',
  SCREEN: 'screen',
  
  // States
  LOADING: 'loading',
  ERROR: 'error',
  SUCCESS: 'success',
  DISABLED: 'disabled',
  ACTIVE: 'active',
  
  // Components
  BUTTON_PRIMARY: 'btn-primary',
  BUTTON_SECONDARY: 'btn-secondary',
  BUTTON_SUCCESS: 'btn-success',
  INPUT: 'input',
  CARD: 'card',
  
  // Payment specific
  PAYMENT_CONTAINER: 'payment-container',
  PAYMENT_HEADER: 'payment-header',
  PAYMENT_METHODS: 'payment-methods',
  PAYMENT_METHOD: 'payment-method',
  PAYMENT_DETAILS: 'payment-details',
  PAYMENT_ACTIONS: 'payment-actions',
  LOADING_CONTAINER: 'loading-container',
  LOADING_SPINNER: 'loading-spinner',
  ERROR_CONTAINER: 'error-container',
  BUTTON_GROUP: 'button-group',
  BADGE_SUCCESS: 'badge-success',
  
  // Status indicators
  ONLINE: 'online',
  OFFLINE: 'offline',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
} as const;

export const ROUTES = {
  // Kiosk routes
  KIOSK_HOME: '/',
  KIOSK_PAYMENT: '/payment',
  KIOSK_CONFIRMATION: '/confirmation',
} as const;

