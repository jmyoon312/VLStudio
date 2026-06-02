import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    base: './',
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        outDir: '../../dist',
        emptyOutDir: true
    },
    publicDir: '../../public',
    server: {
        host: '0.0.0.0', // Allow External Access
        port: 5183,
        proxy: {
            // 0. Swarm WebSocket (Priority)
            '/api/swarm/ws': {
                target: 'http://127.0.0.1:8000',
                ws: true,
                changeOrigin: true,
                secure: false,
            },
            // 1. API Requests
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
                secure: false,
                ws: true,
            },
            '/media': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
            '/downloads': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
            '/static': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
            '/files': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
            '/thumbnails': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
            '/status_bypass': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
            '/health': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
            '/io': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
            '/agent': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
            '/mcp': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
            '/insights': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
            '/workflows': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
            '/templates': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
            '/docs': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
            '/redoc': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },

            // 7. Swarm Hub (WebSockets)
            '/swarm/': {
                target: 'http://127.0.0.1:4000',
                changeOrigin: true,
                ws: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/swarm\//, '')
            },
            // 8. Socket.io (Standard path for Swarm Hub)
            '/socket.io': {
                target: 'http://127.0.0.1:4000',
                changeOrigin: true,
                ws: true,
                secure: false,
            }
        }
    }
});
