/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PARETO_API_ENDPOINT: string;
  readonly DEV: boolean;
  readonly MODE: string;
  // その他の環境変数をここに追加
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
