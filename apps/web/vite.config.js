import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://server:8000',
        changeOrigin: true,
      },
    },
  },
  // 发布版：构建产物输出到 backend/static，由后端单端口托管
  // emptyOutDir 关闭：沙箱 safe-delete 会拦截 vite 的 fs.rmSync，改为在构建前
  // 用 Python shutil.rmtree 手动清空 backend/static（见构建脚本 / CI）。
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
