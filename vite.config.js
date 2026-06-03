import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import renderer from 'vite-plugin-electron-renderer'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'))
const BUILD_NUMBER = Number(pkg.buildNumber ?? 0)

export default defineConfig(({ mode }) => {
  // 환경변수 로드 (mode에 따라 .env 또는 .env.production)
  const env = loadEnv(mode, process.cwd(), '')
  const functionEnv = env.VITE_FUNCTION_ENV || 'test'

  console.log(`\n🔧 Build mode: ${mode}, Function env: ${functionEnv} (${functionEnv === 'prod' ? '_prod' : '_test'} suffix)\n`)

  const isProduction = mode === 'production'

  const createProxy = (target, options = {}) => ({
    target,
    changeOrigin: true,
    secure: false,
    ws: true,
    ...options,
    configure: (proxy) => {
      proxy.on('error', (err, req, res) => {
        if (err.code === 'ECONNREFUSED') {
          console.warn(`[Proxy] Backend unavailable (ECONNREFUSED) for ${req.url} → ${target}`)
          if (res && !res.headersSent && typeof res.writeHead === 'function') {
            try {
              res.writeHead(503, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ status: 'starting', message: 'Backend is launching...' }))
            } catch (e) {}
          }
          return
        }
        console.warn(`[Proxy] Error for ${req.url}:`, err.message)
      })
    }
  })

  const backendProxy = createProxy('http://127.0.0.1:8000')


  return {
    base: './',
    plugins: [
      react(),
      electron({
        main: {
          entry: 'electron/main.js',
          vite: {
            build: {
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['electron']
              }
            },
            esbuild: isProduction ? { drop: ['console', 'debugger'] } : {}
          }
        },
        preload: {
          input: [
            'electron/preload.js',
            'electron/stealth_preload.js',
            'electron/login_preload.js'
          ],
          vite: {
            build: {
              outDir: 'dist-electron',
              rollupOptions: {
                output: {
                  inlineDynamicImports: false
                }
              }
            },
            esbuild: isProduction ? { drop: ['console', 'debugger'] } : {}
          }
        }
      }),
      renderer()
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'apps/dashboard/src')
      },
      preserveSymlinks: false
    },
    build: {
      outDir: 'dist-dummy',
      rollupOptions: {
        input: 'electron/preload.js'
      }
    },
    // renderer (React) — production에서 console/debugger 제거
    esbuild: isProduction ? { drop: ['console', 'debugger'] } : {},
    define: {
      '__APP_VERSION__': JSON.stringify(process.env.npm_package_version || pkg.version || '0.1.0'),
      '__BUILD_NUMBER__': JSON.stringify(BUILD_NUMBER),
      '__BUILD_TARGET__': JSON.stringify(process.env.VITE_BUILD_TARGET || 'nsis'),
      // Compile-time constant — replaces `__FUNCTION_SUFFIX__` in source with
      // the resolved "_prod" or "_test" string. Keeps the unused branch out
      // of the production bundle entirely, so a grep for "_test" on a prod
      // build finds nothing (vs. leaving an if/else in code where the dead
      // branch's string literal would still land in the output).
      '__FUNCTION_SUFFIX__': JSON.stringify(functionEnv === 'prod' ? '_prod' : '_test')
    },
    server: {
      host: '0.0.0.0',
      port: 5183,
      allowedHosts: true,
      cors: true,
      proxy: {
        '/api/swarm/ws': backendProxy,
        '/api': backendProxy,
        '/media': backendProxy,
        '/downloads': backendProxy,
        '/static': backendProxy,
        '/files': backendProxy,
        '/thumbnails': backendProxy,
        '/status_bypass': backendProxy,
        '/health': backendProxy,
        '/io': backendProxy,
        '/agent': backendProxy,
        '/mcp': backendProxy,
        '/insights': backendProxy,
        '/workflows': backendProxy,
        '/templates': backendProxy,
        '/docs': backendProxy,
        '/redoc': backendProxy,
        '/swarm/': createProxy('http://127.0.0.1:4000', {
          rewrite: (path) => path.replace(/^\/swarm\//, '')
        }),
        '/socket.io': createProxy('http://127.0.0.1:4000')
      }
    }
  }
})
