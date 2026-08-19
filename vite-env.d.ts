interface ImportMetaEnv {
  readonly VITE_LM_ENDPOINT?: string;
  readonly VITE_AUTH_SERVER_URL?: string;
  readonly VITE_MVP_FEATURE_SPEC_TIMEOUT_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}