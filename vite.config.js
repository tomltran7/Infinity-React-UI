import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
	plugins: [react()],
	server: {
		port: 3000,
		open: true, // Auto-open browser
		proxy: {
			'/api': 'http://localhost:3001'
		}
	},
	build: {
		outDir: 'dist',
		sourcemap: true,
	},
	define: {
		// Fix potential global variable issues
		global: 'globalThis',
	},
})
