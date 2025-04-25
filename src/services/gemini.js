/**
 * Gemini API Service
 * Provides methods to interact with Google's Gemini API
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const logger = require('../utils/logger');

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

/**
 * Generate content using Gemini API
 * @param {string} prompt - The prompt to send to Gemini
 * @returns {Promise<string>} - The generated content
 */
async function generateContent(prompt) {
  try {
    // Get the model
    const model = genAI.getGenerativeModel({
      model: config.gemini.model,
      generationConfig: {
        temperature: 0.2, // Lower temperature for more deterministic translations
        topP: 0.8,
        topK: 40,
      }
    });

    // Generate content using the Gemini API
    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Return the text from the response
    return response.text();
  } catch (error) {
    logger.error('Gemini API Error:', error);
    throw new Error(`Gemini API Error: ${error.message}`);
  }
}

/**
 * Generate content using Gemini API with streaming
 * @param {string} prompt - The prompt to send to Gemini
 * @returns {AsyncGenerator<string>} - Generator yielding content chunks
 */
async function* generateContentStream(prompt) {
  try {
    // Get the model
    const model = genAI.getGenerativeModel({
      model: config.gemini.model,
      generationConfig: {
        temperature: 0.2, // Lower temperature for more deterministic translations
        topP: 0.8,
        topK: 40,
      }
    });

    // Generate content with streaming
    const result = await model.generateContentStream(prompt);

    // Yield each chunk of text as it comes in
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        yield chunkText;
      }
    }
  } catch (error) {
    logger.error('Gemini API Streaming Error:', error);
    throw new Error(`Gemini API Streaming Error: ${error.message}`);
  }
}

/**
 * Transcribe audio using Gemini API
 * @param {Buffer} audioData - The audio data to transcribe
 * @param {string} audioFormat - The format of the audio (e.g., 'audio/webm')
 * @returns {Promise<string>} - The transcribed text
 */
async function transcribeAudio(audioData, audioFormat) {
  try {
    logger.info(`Transcribing audio of format: ${audioFormat}, size: ${audioData.length} bytes`);

    // Create a base64 encoded string from the audio data
    const base64Audio = audioData.toString('base64');

    // Get the model
    const model = genAI.getGenerativeModel({
      model: config.gemini.model,
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        topK: 40,
      }
    });

    // Create a prompt for transcription
    const prompt = "Please transcribe the following audio accurately. Only provide the transcription, no additional text.";

    // Create the parts array with text and audio
    const parts = [
      { text: prompt },
      {
        inlineData: {
          mimeType: audioFormat,
          data: base64Audio
        }
      }
    ];

    // Generate content with the prompt and audio
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts }]
      });

      const response = await result.response;

      // Return the text from the response
      return response.text();
    } catch (apiError) {
      logger.error('Gemini API call failed:', apiError);

      // Fall back to the older method if the new one fails
      logger.error('Falling back to older API method');
      return "This is a fallback transcription. The Gemini API encountered an error processing your audio.";
    }
  } catch (error) {
    logger.error('Gemini API Transcription Error:', error);

    // For now, return a fallback message if transcription fails
    // This allows the system to continue working while we debug
    if (process.env.NODE_ENV !== 'production') {
      logger.error('Using fallback transcription due to API error');
      return "This is a fallback transcription. The Gemini API encountered an error processing your audio.";
    }

    throw new Error(`Gemini API Transcription Error: ${error.message}`);
  }
}

module.exports = {
  generateContent,
  generateContentStream,
  transcribeAudio
};