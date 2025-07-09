import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	
	// Performance optimizations
	build: {
		target: 'es2020',
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: true, // Remove console.log in production
				drop_debugger: true
			}
		},
		rollupOptions: {
			output: {
				manualChunks: {
					// Separate vendor chunks for better caching
					'vendor-svelte': ['svelte', '@sveltejs/kit'],
					'vendor-ml': ['onnxruntime-web'],
					'vendor-ui': ['daisyui']
				}
			}
		},
		// Enable source maps for debugging
		sourcemap: true,
		// Increase chunk size warning limit for ML models
		chunkSizeWarningLimit: 2000
	},
	
	// Development optimizations
	server: {
		fs: {
			// Allow serving files from project root
			allow: ['..']
		}
	},
	
	// Optimize dependencies
	optimizeDeps: {
		include: [
			'onnxruntime-web',
			'@sveltejs/kit',
			'svelte'
		],
		exclude: [
			// Large ML models should not be pre-bundled
			'*.onnx'
		]
	},
	
	// Define environment variables
	define: {
		__APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
		__BUILD_DATE__: JSON.stringify(new Date().toISOString())
	},
	
	// Worker configuration for better performance
	worker: {
		format: 'es'
	}
}); 