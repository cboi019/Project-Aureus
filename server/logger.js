// logger.js
const logger = {
  info: (message, meta = {}) => {
    const timestamp = new Date().toLocaleString();
    console.log(`[${timestamp}] ℹ️ INFO: ${message}`, Object.keys(meta).length ? meta : "");
  },
  error: (message, error = {}) => {
    const timestamp = new Date().toLocaleString();
    console.error(`[${timestamp}] ❌ ERROR: ${message}`);
    if (error.stack) {
      console.error(error.stack);
    } else {
      console.error(error);
    }
  },
  cron: (message) => {
    const timestamp = new Date().toLocaleString();
    console.log(`[${timestamp}] 🤖 CRON: ${message}`);
  }
};

module.exports = logger;