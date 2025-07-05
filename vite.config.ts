import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			strategies: 'generateSW',
			registerType: 'autoUpdate',
			manifest: {
				name: 'EcoScan - AI Waste Classification',
				short_name: 'EcoScan',
				description: 'Real-time waste classification using computer vision and voice recognition',
				theme_color: '#22c55e',
				background_color: '#ffffff',
				display: 'standalone',
				orientation: 'portrait',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: '/favicon.svg',
						sizes: 'any',
						type: 'image/svg+xml'
					}
				],
				categories: ['utilities', 'productivity', 'education']
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts-cache',
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
							}
						}
					},
					{
						urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
						handler: 'CacheFirst',
						options: {
							cacheName: 'images-cache',
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
							}
						}
					},
					{
						urlPattern: /\.onnx$/,
						handler: 'CacheFirst',
						options: {
							cacheName: 'models-cache',
							expiration: {
								maxEntries: 5,
								maxAgeSeconds: 60 * 60 * 24 * 90 // 90 days
							}
						}
					}
				]
			},
			devOptions: {
				enabled: false,
				type: 'module'
			}
		})
	],
	optimizeDeps: {
		include: ['fuse.js'],
		exclude: ['onnxruntime-web']
	},
	build: {
		target: 'esnext',
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					if (id.includes('fuse.js')) {
						return 'search-vendor';
					}
				}
			}
		}
	},
	server: {
		headers: {
			'Cross-Origin-Embedder-Policy': 'require-corp',
			'Cross-Origin-Opener-Policy': 'same-origin'
		}
	}
});
