# EcoScan Deployment Guide

**Project**: EcoScan - AI-Powered Waste Classification  
**Repository**: https://github.com/swarajb-778/EcoScan  
**Status**: Production Ready ✅

## Quick Start

```bash
# Clone the repository
git clone https://github.com/swarajb-778/EcoScan.git
cd EcoScan

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Prerequisites

### System Requirements
- **Node.js**: 18.0+ (LTS recommended)
- **npm**: 9.0+ or **pnpm**: 8.0+
- **Modern Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Hardware Requirements
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 1GB free space for dependencies
- **GPU**: WebGL 2.0 support recommended for optimal ML performance

## Environment Setup

### 1. Clone and Install
```bash
git clone https://github.com/swarajb-778/EcoScan.git
cd EcoScan
npm install
```

### 2. Environment Variables (Optional)
Create `.env` file for custom configuration:

```bash
# Application Configuration
VITE_APP_NAME=EcoScan
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION=AI-Powered Waste Classification

# Feature Flags
VITE_ENABLE_VOICE_INPUT=true
VITE_ENABLE_CAMERA_DETECTION=true
VITE_ENABLE_IMAGE_UPLOAD=true
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_DEBUG_MODE=false

# Analytics (Optional)
VITE_ENABLE_ANALYTICS=false
VITE_ANALYTICS_ID=
VITE_SENTRY_DSN=

# Model Configuration
VITE_MODEL_CONFIDENCE_THRESHOLD=0.5
VITE_MODEL_NMS_THRESHOLD=0.4
VITE_MAX_DETECTIONS=20

# PWA Configuration
VITE_PWA_ENABLED=true
VITE_PWA_THEME_COLOR=#22c55e
VITE_PWA_BACKGROUND_COLOR=#ffffff
```

### 3. Verify Installation
```bash
# Check if all dependencies are installed
npm run check

# Run development server
npm run dev
```

## Development

### Available Scripts
```bash
# Development
npm run dev          # Start dev server with hot reload
npm run dev:host     # Start dev server accessible on network

# Building
npm run build        # Build for production
npm run preview      # Preview production build locally

# Quality Assurance
npm run check        # Type checking
npm run check:watch  # Type checking in watch mode
npm run lint         # ESLint checking
npm run format       # Prettier formatting

# Testing
npm run test         # Run test suite (if configured)
npm run test:watch   # Run tests in watch mode
```

### Development Server
- **Local**: http://localhost:5173
- **Network**: http://[your-ip]:5173 (with `npm run dev:host`)

## Production Deployment

### Static Site Deployment

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or connect GitHub repository at vercel.com
```

#### Netlify
```bash
# Build
npm run build

# Deploy build folder to Netlify
# Or connect GitHub repository at netlify.com
```

#### GitHub Pages
```bash
# Install gh-pages
npm install -D gh-pages

# Add to package.json scripts:
"deploy": "gh-pages -d build"

# Deploy
npm run build
npm run deploy
```

### Server Deployment

#### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
# Build and run
docker build -t ecoscan .
docker run -p 80:80 ecoscan
```

#### Traditional Server
```bash
# Build the application
npm run build

# Serve with any static file server
npx serve build
# or
python -m http.server 8000 -d build
# or upload build/ folder to your web server
```

### Environment-Specific Configurations

#### Production Optimizations
```javascript
// vite.config.js additions for production
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['svelte'],
          ml: ['onnxruntime-web'],
          utils: ['fuse.js']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    minify: 'terser'
  }
}
```

## Performance Optimization

### Model Optimization
- **YOLOv8 Model**: Pre-optimized ONNX format (12MB)
- **Caching**: Service worker caches model after first load
- **WebGL**: Hardware acceleration for inference
- **Progressive Loading**: Model loads in background

### Bundle Optimization
- **Code Splitting**: Automatic route-based splitting
- **Tree Shaking**: Unused code eliminated
- **Compression**: Gzip/Brotli compression recommended
- **Preloading**: Critical resources preloaded

### Recommended Server Configuration

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/ecoscan;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/xml+rss 
               application/json image/svg+xml;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Cache ML models
    location ~* \.(onnx)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Handle SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy strict-origin-when-cross-origin;
}
```

#### Apache Configuration
```apache
# .htaccess
RewriteEngine On
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Cache static files
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
</IfModule>
```

## Security Considerations

### HTTPS Requirements
- **PWA Requirement**: HTTPS required for service worker and camera access
- **Certificate**: Use Let's Encrypt for free SSL certificates
- **HSTS**: Enable HTTP Strict Transport Security

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'wasm-unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob:;
    media-src 'self' blob:;
    connect-src 'self';
    worker-src 'self';
">
```

### Privacy Compliance
- **Local Processing**: All ML inference happens locally
- **No Data Collection**: No personal data sent to servers
- **Camera Access**: Only when explicitly granted by user
- **Storage**: Only essential app data cached locally

## Monitoring and Analytics

### Performance Monitoring
- **Built-in Metrics**: Performance monitor tracks key metrics
- **Web Vitals**: Core Web Vitals automatically collected
- **Error Tracking**: Comprehensive error handling and logging

### Optional Analytics Integration
```javascript
// Enable analytics in production
// Set VITE_ENABLE_ANALYTICS=true
// Add your analytics ID to VITE_ANALYTICS_ID
```

## Troubleshooting

### Common Issues

#### Model Loading Fails
```bash
# Check if model file exists
ls static/models/yolov8n.onnx

# Verify file size (should be ~12MB)
du -h static/models/yolov8n.onnx

# Check browser console for CORS errors
```

#### Camera Access Denied
- Ensure HTTPS is enabled
- Check browser permissions
- Verify WebRTC support

#### Performance Issues
- Check WebGL support: `chrome://gpu/`
- Monitor memory usage in DevTools
- Reduce inference frequency if needed

#### Build Failures
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+

# Update dependencies
npm update
```

### Browser Compatibility
- **Chrome/Edge**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Limited WebGL performance
- **Mobile**: iOS 14+, Android 8+

### Performance Expectations
- **Desktop**: 25+ FPS, <100ms inference
- **High-end Mobile**: 15+ FPS, <200ms inference  
- **Mid-range Mobile**: 10+ FPS, <500ms inference
- **Low-end Mobile**: 5+ FPS, basic functionality

## Scaling Considerations

### CDN Integration
- Host static assets on CDN
- Use edge locations for global performance
- Cache ML model files aggressively

### Load Balancing
- Application is stateless and scales horizontally
- No server-side processing required
- Can be deployed to multiple regions

### Cost Optimization
- Static hosting is very cost-effective
- No server costs for ML processing
- Bandwidth costs scale with usage

## Support and Maintenance

### Updates
- Monitor for security updates
- Update dependencies regularly
- Test thoroughly before deploying updates

### Backup Strategy
- Source code in Git repository
- Static assets backed up
- No database backup needed

### Community
- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: Comprehensive docs in `/docs` folder
- **Support**: Community-driven support

## Conclusion

EcoScan is designed for easy deployment and maintenance with:

- ✅ **Zero Server Requirements**: Pure client-side application
- ✅ **Automatic Scaling**: CDN-friendly static assets
- ✅ **High Performance**: Optimized for various devices
- ✅ **Security First**: Local processing, no data collection
- ✅ **PWA Ready**: Installable, offline-capable
- ✅ **Production Tested**: Comprehensive error handling

The application is ready for immediate production deployment with minimal configuration required.

**Repository**: https://github.com/swarajb-778/EcoScan  
**Live Demo**: Deploy to see it in action!  
**Documentation**: Complete docs in `/docs` folder 