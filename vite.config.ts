import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // ONNX Runtime Web: Viteのesbuildプリバンドルを除外（WASMバイナリが壊れるのを防ぐ）
  optimizeDeps: {
    exclude: ['onnxruntime-web', 'onnxruntime-web/wasm'],
  },

  // WASMとONNXファイルをアセットとして認識
  assetsInclude: ['**/*.wasm', '**/*.onnx'],

  build: {
    target: 'esnext',
  },

  // Web WorkerをES moduleフォーマットで出力
  worker: {
    format: 'es',
  },

  server: {
    // 開発時はCOOP/COEPヘッダーを外す（Google Identity Servicesスクリプトとの互換性のため）
    // ONNX Runtime WebはSharedArrayBuffer無しでもシングルスレッドで動作する
    // 本番環境ではnetlify.tomlでcredentiallessを設定
    headers: {},
  },
})
