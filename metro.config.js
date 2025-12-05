const { getDefaultConfig } = require('expo/metro-config');
const { createProxyMiddleware } = require('http-proxy-middleware');

const config = getDefaultConfig(__dirname);

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware, metroServer) => {
    return (req, res, next) => {
      if (req.url.startsWith('/api/')) {
        const proxy = createProxyMiddleware({
          target: 'http://localhost:5000',
          changeOrigin: true,
          logLevel: 'debug',
        });
        return proxy(req, res, next);
      }
      return metroMiddleware(req, res, next);
    };
  },
};

module.exports = config;
