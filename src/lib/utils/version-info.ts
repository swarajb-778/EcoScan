/**
 * Version Information Utility
 * Provides application version and build information
 */

export const VERSION_INFO = {
  version: '1.0.0',
  buildDate: new Date().toISOString(),
  features: [
    'Real-time AI waste detection',
    'Automatic error recovery',
    'Performance optimization',
    'Comprehensive diagnostics',
    'SSR-safe architecture',
    'WebGL acceleration',
    'Progressive Web App',
    'Voice input support',
    'Offline capabilities'
  ],
  technologies: {
    frontend: 'SvelteKit + TypeScript',
    ai: 'ONNX.js + YOLOv8',
    styling: 'TailwindCSS + DaisyUI',
    deployment: 'Vercel/Netlify'
  },
  changelog: {
    '1.0.0': [
      'Initial release with AI-powered waste detection',
      'Real-time camera-based classification',
      'Voice input for accessibility',
      'Comprehensive error handling and recovery',
      'Performance optimization for all device types',
      'Full diagnostic and monitoring system',
      'Progressive Web App with offline support'
    ]
  }
};

export function getVersionInfo() {
  return {
    ...VERSION_INFO,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR',
    timestamp: new Date().toISOString()
  };
}

export function logVersionInfo() {
  console.log(`
🌱 EcoScan v${VERSION_INFO.version}
Built: ${VERSION_INFO.buildDate}
Features: ${VERSION_INFO.features.length} core features
Technologies: ${Object.keys(VERSION_INFO.technologies).length} tech stacks
  `);
} 