/**
 * WebSocket Server for Real-time Audio Transcription
 * Handles streaming audio from the browser to the Gemini Live API
 */

const WebSocket = require('ws');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const logger = require('../utils/logger');

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

// Store active sessions
const activeSessions = new Map();

/**
 * Initialize the WebSocket server
 * @param {Object} server - HTTP server instance
 */
function initWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  logger.info('WebSocket server initialized');

  wss.on('connection', handleConnection);

  return wss;
}

/**
 * Handle a new WebSocket connection
 * @param {WebSocket} ws - WebSocket connection
 */
function handleConnection(ws) {
  logger.info('New WebSocket connection established');

  // Generate a unique session ID
  const sessionId = generateSessionId();

  // Store the session
  activeSessions.set(sessionId, {
    ws,
    targetLanguage: 'en', // Default target language
    audioChunks: [],
    isTranscribing: false,
    geminiModel: null,
    geminiStream: null
  });

  // Send session ID to client
  ws.send(JSON.stringify({
    type: 'session',
    sessionId
  }));

  // Set up event handlers
  ws.on('message', (message) => handleMessage(message, sessionId));
  ws.on('close', () => handleClose(sessionId));
  ws.on('error', (error) => handleError(error, sessionId));
}

/**
 * Handle incoming WebSocket messages
 * @param {Buffer|String} message - Message data
 * @param {String} sessionId - Session ID
 */
async function handleMessage(message, sessionId) {
  const session = activeSessions.get(sessionId);

  if (!session) {
    logger.error(`Received message for unknown session: ${sessionId}`);
    return;
  }

  try {
    // Check if the message is a string (command) or binary (audio data)
    if (typeof message === 'string' || message instanceof Buffer && message.toString().startsWith('{')) {
      // Parse command
      const command = JSON.parse(message.toString());

      switch (command.type) {
        case 'start':
          await handleStartCommand(command, sessionId);
          break;

        case 'stop':
          await handleStopCommand(sessionId);
          break;

        case 'setLanguage':
          handleSetLanguageCommand(command, sessionId);
          break;

        default:
          logger.error(`Unknown command type: ${command.type}`);
      }
    } else {
      // Handle audio data
      await handleAudioData(message, sessionId);
    }
  } catch (error) {
    logger.error(`Error handling WebSocket message: ${error.message}`);

    // Send error to client
    session.ws.send(JSON.stringify({
      type: 'error',
      error: error.message
    }));
  }
}

/**
 * Handle the 'start' command to begin transcription
 * @param {Object} command - Command data
 * @param {String} sessionId - Session ID
 */
async function handleStartCommand(command, sessionId) {
  const session = activeSessions.get(sessionId);

  if (session.isTranscribing) {
    logger.info(`Session ${sessionId} is already transcribing`);
    return;
  }

  logger.info(`Starting transcription for session ${sessionId}`);

  // Update session state
  session.isTranscribing = true;
  session.audioChunks = [];

  // Initialize Gemini model
  try {
    session.geminiModel = genAI.getGenerativeModel({
      model: config.gemini.model,
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        topK: 40,
      }
    });

    // Create a chat session
    const chat = session.geminiModel.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "Please transcribe the following audio accurately. Only provide the transcription, no additional text." }],
        },
        {
          role: "model",
          parts: [{ text: "I'll transcribe the audio you provide accurately, giving you just the transcription without any additional text." }],
        },
      ],
    });

    session.geminiChat = chat;

    // Notify client that transcription has started
    session.ws.send(JSON.stringify({
      type: 'started',
      message: 'Transcription started'
    }));
  } catch (error) {
    logger.error(`Error initializing Gemini model: ${error.message}`);
    session.isTranscribing = false;
    throw error;
  }
}

/**
 * Handle the 'stop' command to end transcription
 * @param {String} sessionId - Session ID
 */
async function handleStopCommand(sessionId) {
  const session = activeSessions.get(sessionId);

  if (!session.isTranscribing) {
    logger.info(`Session ${sessionId} is not transcribing`);
    return;
  }

  logger.info(`Stopping transcription for session ${sessionId}`);

  // Process any remaining audio data
  if (session.audioChunks.length > 0) {
    try {
      await processAudioChunks(sessionId);
    } catch (error) {
      logger.error(`Error processing final audio chunks: ${error.message}`);
    }
  }

  // Update session state
  session.isTranscribing = false;
  session.audioChunks = [];

  // Notify client that transcription has stopped
  session.ws.send(JSON.stringify({
    type: 'stopped',
    message: 'Transcription stopped'
  }));
}

/**
 * Handle the 'setLanguage' command to change the target language
 * @param {Object} command - Command data
 * @param {String} sessionId - Session ID
 */
function handleSetLanguageCommand(command, sessionId) {
  const session = activeSessions.get(sessionId);

  if (!command.language) {
    logger.error('No language specified in setLanguage command');
    return;
  }

  logger.info(`Setting language for session ${sessionId} to ${command.language}`);

  // Update session state
  session.targetLanguage = command.language;

  // Notify client that language has been set
  session.ws.send(JSON.stringify({
    type: 'languageSet',
    language: command.language
  }));
}

/**
 * Handle incoming audio data
 * @param {Buffer} audioData - Audio data
 * @param {String} sessionId - Session ID
 */
async function handleAudioData(audioData, sessionId) {
  const session = activeSessions.get(sessionId);

  if (!session.isTranscribing) {
    logger.info(`Received audio data for session ${sessionId} but not transcribing`);
    return;
  }

  // Add audio data to chunks
  session.audioChunks.push(audioData);

  // If we have enough audio data, process it
  if (session.audioChunks.length >= 5) { // Process every 5 chunks
    await processAudioChunks(sessionId);
  }
}

/**
 * Process accumulated audio chunks
 * @param {String} sessionId - Session ID
 */
async function processAudioChunks(sessionId) {
  const session = activeSessions.get(sessionId);

  if (session.audioChunks.length === 0) {
    return;
  }

  try {
    // Combine audio chunks
    const combinedAudio = Buffer.concat(session.audioChunks);

    // Convert to base64
    const base64Audio = combinedAudio.toString('base64');

    // Clear audio chunks
    session.audioChunks = [];

    // Send to Gemini for transcription
    // The sendMessage method expects parts directly, not wrapped in contents
    const result = await session.geminiChat.sendMessage([
      {
        inlineData: {
          mimeType: 'audio/webm',
          data: base64Audio
        }
      }
    ]);

    const response = await result.response;
    const transcription = response.text();

    // Send transcription to client
    if (transcription && transcription.trim()) {
      session.ws.send(JSON.stringify({
        type: 'transcription',
        text: transcription.trim()
      }));

      // Also translate the transcription if needed
      if (session.targetLanguage !== 'en') {
        await translateAndSend(transcription.trim(), session.targetLanguage, session.ws);
      }
    }
  } catch (error) {
    logger.error(`Error processing audio chunks: ${error.message}`);

    // Send fallback message to client
    session.ws.send(JSON.stringify({
      type: 'transcription',
      text: 'Audio processing error. Please try again.',
      error: true
    }));
  }
}

/**
 * Translate text and send to client
 * @param {String} text - Text to translate
 * @param {String} targetLanguage - Target language code
 * @param {WebSocket} ws - WebSocket connection
 */
async function translateAndSend(text, targetLanguage, ws) {
  try {
    // Use the Gemini model to translate
    const model = genAI.getGenerativeModel({
      model: config.gemini.model,
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        topK: 40,
      }
    });

    const prompt = `Translate the following English text to ${targetLanguage}: "${text}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const translation = response.text();

    // Send translation to client
    ws.send(JSON.stringify({
      type: 'translation',
      text: translation.trim(),
      sourceText: text,
      targetLanguage
    }));
  } catch (error) {
    logger.error(`Error translating text: ${error.message}`);

    // Send error to client
    ws.send(JSON.stringify({
      type: 'translation',
      text: 'Translation error. Please try again.',
      sourceText: text,
      targetLanguage,
      error: true
    }));
  }
}

/**
 * Handle WebSocket connection close
 * @param {String} sessionId - Session ID
 */
function handleClose(sessionId) {
  logger.info(`WebSocket connection closed for session ${sessionId}`);

  // Clean up session
  const session = activeSessions.get(sessionId);

  if (session) {
    // Clean up any resources
    session.audioChunks = [];
    session.isTranscribing = false;
    session.geminiModel = null;
    session.geminiChat = null;

    // Remove session
    activeSessions.delete(sessionId);
  }
}

/**
 * Handle WebSocket errors
 * @param {Error} error - Error object
 * @param {String} sessionId - Session ID
 */
function handleError(error, sessionId) {
  logger.error(`WebSocket error for session ${sessionId}: ${error.message}`);

  // Clean up session on error
  handleClose(sessionId);
}

/**
 * Generate a unique session ID
 * @returns {String} - Unique session ID
 */
function generateSessionId() {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

module.exports = {
  initWebSocketServer
};
