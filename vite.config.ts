import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 使用轮询，确保外部工具写入文件时也能触发热更新。
    watch: { usePolling: true, interval: 300 },
  },
})
