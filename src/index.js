/**
 * Live Translation System
 * Main application entry point
 */

const translator = require('./translators');
const logger = require('./utils/logger');
const config = require('./config');

// Check if Gemini API key is configured
if (!config.gemini.apiKey) {
  logger.error('GEMINI_API_KEY is not set in environment variables');
  process.exit(1);
}

// Export translation functionality for direct use
const translationSystem = {
  translate: translator.translate,
  translateStream: translator.translateStream,
  supportedLanguages: translator.supportedLanguages
};

// Start the API server if this file is run directly (not imported as a module)
if (require.main === module) {
  // Import server only when needed to avoid circular dependency
  const apiServer = require('./api/server');
  const http = require('http');
  const websocketServer = require('./services/websocket-server');

  // Create HTTP server with Express app
  const server = http.createServer(apiServer.app);

  // Initialize WebSocket server
  websocketServer.initWebSocketServer(server);

  // Start the server
  const PORT = config.server.port;
  server.listen(PORT, () => {
    logger.info(`Translation API server running on port ${PORT}`);
    logger.info('Translation system started with WebSocket support');
  });
}

// Export for use as a module
module.exports = translationSystem;
