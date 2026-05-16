const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Increase timeout for slower connections
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Increase timeout to 5 minutes for slow networks
      req.setTimeout(300000);
      res.setTimeout(300000);
      return middleware(req, res, next);
    };
  },
};

// Increase resolver timeout
config.resolver = {
  ...config.resolver,
  resolverMainFields: ['react-native', 'browser', 'main'],
};

module.exports = config;
