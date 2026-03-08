import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    hmr: {
      clientPort: 5173,
      protocol: 'ws',
    },
    // 增加请求体大小限制
    maxRequestBodySize: '100mb',
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // 支持 WebSocket
        ws: true,
        // 增加超时设置以支持大文件上传
        timeout: 600000, // 10分钟超时
        proxyTimeout: 600000,
        // 不限制请求体大小
        limit: undefined,
        // 保持连接
        keepAlive: true,
        // 配置代理
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('代理错误:', err.message)
          })
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('代理请求:', req.method, req.url, 'Content-Length:', req.headers['content-length'])
            // 设置更大的超时
            proxyReq.setTimeout(600000)
          })
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('代理响应:', proxyRes.statusCode, req.url)
          })
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
