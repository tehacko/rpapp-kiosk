/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly REACT_APP_API_URL?: string;
  readonly REACT_APP_WS_URL?: string;
  readonly REACT_APP_ENABLE_MOCK_PAYMENTS?: string;
  readonly REACT_APP_PAYMENT_MODE?: string;
  readonly REACT_APP_SHOW_DEBUG_INFO?: string;
  readonly REACT_APP_LOG_LEVEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

declare module '*.css' {
  const content: string;
  export default content;
}

