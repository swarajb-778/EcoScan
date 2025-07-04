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
						src: '/pwa-64x64.png',
						sizes: '64x64',
						type: 'image/png'
					},
					{
						src: '/pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png'
					},
					{
						src: '/maskable-icon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				],
				categories: ['utilities', 'productivity', 'education'],
				screenshots: [
					{
						src: '/screenshot-mobile.png',
						sizes: '390x844',
						type: 'image/png',
						form_factor: 'narrow'
					},
					{
						src: '/screenshot-desktop.png',
						sizes: '1280x720',
						type: 'image/png',
						form_factor: 'wide'
					}
				]
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
		include: ['onnxruntime-web', 'fuse.js']
	},
	build: {
		target: 'esnext',
		rollupOptions: {
			output: {
				manualChunks: {
					'ml-vendor': ['onnxruntime-web'],
					'search-vendor': ['fuse.js']
				}
			}
		}
	}
});
