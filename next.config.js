// next.config.js - Configurazione per Tauri desktop app
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export per Tauri WebView
  output: 'export',

  reactStrictMode: true,

  // Disabilita image optimization (non supportata in static export)
  images: {
    unoptimized: true,
  },

  // Webpack config per evitare warning su API Node non disponibili nel browser
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
