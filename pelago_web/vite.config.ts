import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // 注入 Buffer 全局对象 (Solana Web3.js 依赖)
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // 提供 Node.js polyfills
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      // 定义全局变量
      define: {
        global: 'globalThis',
      },
    },
  },
})
