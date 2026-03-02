/// <reference types="vite/client" />

// 本番ビルド用の環境変数（.env または VITE_* で設定）
interface ImportMetaEnv {
  readonly VITE_API_ENDPOINT?: string;
  readonly VITE_DEFAULT_ENDPOINT?: string;
  readonly VITE_APP_BASE_URL?: string;
}
