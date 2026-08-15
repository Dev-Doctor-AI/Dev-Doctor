interface ImportMetaEnv {
  readonly VITE_LM_ENDPOINT?: string;
  readonly VITE_AUTH_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}