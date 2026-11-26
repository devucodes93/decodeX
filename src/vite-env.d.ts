/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** "true" shows the maintenance page on the public site. */
  readonly VITE_MAINTENANCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
