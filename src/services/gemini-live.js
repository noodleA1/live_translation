/**
 * Gemini Live API Service
 * Provides methods to interact with Google's Gemini Live API for real-time audio transcription
 */

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const config = require('../config');
const logger = require('../utils/logger');

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

/**
 * Transcribe audio using Gemini Live API
 * @param {Buffer} audioData - The audio data to transcribe
 * @param {string} audioFormat - The format of the audio (e.g., 'audio/webm')
 * @returns {Promise<string>} - The transcribed text
 */
async function transcribeAudio(audioData, audioFormat) {
  try {
    logger.info(`Transcribing audio with Gemini Live API: format=${audioFormat}, size=${audioData.length} bytes`);

    // Get the model
    const model = genAI.getGenerativeModel({
      model: config.gemini.model,
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        topK: 40,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    // Create a chat session
    const chat = model.startChat({
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

    // Convert audio to base64
    const base64Audio = audioData.toString('base64');

    // Send the audio for transcription
    // The sendMessage method expects parts directly, not wrapped in contents
    const result = await chat.sendMessage([
      {
        inlineData: {
          mimeType: audioFormat,
          data: base64Audio
        }
      }
    ]);

    // Get the response
    const response = await result.response;

    // Return the transcription
    return response.text();
  } catch (error) {
    logger.error('Gemini Live API Error:', error);

    // For now, return a fallback message if transcription fails
    // This allows the system to continue working while we debug
    if (process.env.NODE_ENV !== 'production') {
      logger.error('Using fallback transcription due to API error');
      return "This is a fallback transcription. The Gemini Live API encountered an error processing your audio.";
    }

    throw new Error(`Gemini Live API Error: ${error.message}`);
  }
}

module.exports = {
  transcribeAudio
};
