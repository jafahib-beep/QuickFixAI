module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      REPLIT_DEV_DOMAIN: process.env.REPLIT_DEV_DOMAIN || null,
    },
  };
};
