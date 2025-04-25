
/**
 * Translation API Server
 */

const express = require('express');
const config = require('../config');
const logger = require('../utils/logger');
// Import translator directly to avoid circular dependency
const translator = require('../translators');

const app = express();
app.use(express.json());

// Enable CORS for browser testing
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Add middleware to handle file uploads
app.use(express.raw({
  type: ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/*'],
  limit: '10mb' // Limit file size to 10MB
}));

// Health check endpoint
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'ok' });
});

// Translation endpoint
app.post('/translate', async (req, res) => {
  try {
    const { text, targetLang, sourceLang } = req.body;

    if (!text || !targetLang) {
      return res.status(400).json({
        error: 'Missing required parameters. Please provide text and targetLang.'
      });
    }

    const translatedText = await translator.translate(text, targetLang, sourceLang);

    res.json({
      original: text,
      translated: translatedText,
      sourceLang: sourceLang || 'auto-detected',
      targetLang
    });
  } catch (error) {
    logger.error('Translation API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get supported languages
app.get('/languages', (_, res) => {
  res.json({
    languages: translator.supportedLanguages
  });
});

// Transcription endpoint
app.post('/transcribe', async (req, res) => {
  try {
    // Check if we have audio data
    if (!req.body || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({
        error: 'Missing audio data. Please provide audio content in the request body.'
      });
    }

    // Get the content type from the request
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.startsWith('audio/')) {
      return res.status(400).json({
        error: 'Invalid content type. Please provide audio content with a valid audio/* MIME type.'
      });
    }

    logger.info(`Received transcription request with content type: ${contentType}, size: ${req.body.length} bytes`);

    // Transcribe the audio
    try {
      const transcription = await translator.transcribeAudio(req.body, contentType);

      // Return the transcription
      res.json({
        transcription,
        contentType
      });
    } catch (transcriptionError) {
      logger.error('Transcription processing error:', transcriptionError);

      // If there's an error with the Gemini API, return a more specific error
      if (transcriptionError.message.includes('Gemini API')) {
        return res.status(500).json({
          error: transcriptionError.message,
          details: 'There was an error processing your audio with the Gemini API. This may be due to audio format incompatibility or API limitations.'
        });
      }

      // For other errors
      throw transcriptionError;
    }
  } catch (error) {
    logger.error('Transcription API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
function startServer() {
  const PORT = config.server.port;
  app.listen(PORT, () => {
    logger.info(`Translation API server running on port ${PORT}`);
  });
}

module.exports = {
  app,
  startServer
};
