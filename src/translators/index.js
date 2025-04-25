
/**
 * Translation Service
 * Uses Gemini API to translate text between languages
 */

const gemini = require('../services/gemini');
const geminiLive = require('../services/gemini-live');
const config = require('../config');
const logger = require('../utils/logger');
const { Readable } = require('stream');
const validators = require('../utils/validators');

/**
 * Translate text using Gemini API
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code
 * @param {string} sourceLang - Source language code (optional, defaults to auto-detect)
 * @returns {Promise<string>} - Translated text
 */
async function translate(text, targetLang, sourceLang = config.translation.defaultSourceLang) {
  // Validate inputs
  const validation = validators.validateTranslationRequest({
    text,
    targetLang,
    sourceLang
  });

  if (!validation.isValid) {
    throw new Error(validation.errors.join(', '));
  }

  // Create prompt for translation
  let prompt = '';

  if (sourceLang === 'auto' || sourceLang === config.translation.defaultSourceLang) {
    prompt = `Translate the following text to ${targetLang}. Only respond with the translation, no explanations or additional text:\n\n${text}`;
  } else {
    prompt = `Translate the following text from ${sourceLang} to ${targetLang}. Only respond with the translation, no explanations or additional text:\n\n${text}`;
  }

  // Get translation from Gemini
  const translation = await gemini.generateContent(prompt);
  return translation.trim();
}

/**
 * Create a streaming translation
 * @param {Readable} inputStream - Stream of text to translate
 * @param {string} targetLang - Target language code
 * @param {string} sourceLang - Source language code (optional)
 * @returns {Readable} - Stream of translated text
 */
function translateStream(inputStream, targetLang, sourceLang = config.translation.defaultSourceLang) {
  if (!inputStream || typeof inputStream.on !== 'function') {
    throw new Error('Input must be a readable stream');
  }

  // Validate language
  if (!validators.isValidLanguage(targetLang)) {
    throw new Error(`Target language '${targetLang}' is not supported`);
  }

  if (sourceLang !== 'auto' && !validators.isValidLanguage(sourceLang)) {
    throw new Error(`Source language '${sourceLang}' is not supported`);
  }

  // Create output stream
  const outputStream = new Readable({
    read() {} // This is required but we don't need to implement it
  });

  // Buffer to collect chunks of text
  let textBuffer = '';

  // Process input stream
  inputStream.on('data', async (chunk) => {
    textBuffer += chunk.toString();

    // If we have a complete sentence or paragraph, translate it
    if (textBuffer.match(/[.!?]\s*$/)) {
      const textToTranslate = textBuffer;
      textBuffer = ''; // Reset buffer

      try {
        // Create prompt for translation
        let prompt = '';
        if (sourceLang === 'auto' || sourceLang === config.translation.defaultSourceLang) {
          prompt = `Translate the following text to ${targetLang}. Only respond with the translation, no explanations or additional text:\n\n${textToTranslate}`;
        } else {
          prompt = `Translate the following text from ${sourceLang} to ${targetLang}. Only respond with the translation, no explanations or additional text:\n\n${textToTranslate}`;
        }

        // Use streaming translation
        const streamGenerator = gemini.generateContentStream(prompt);

        for await (const translationChunk of streamGenerator) {
          outputStream.push(translationChunk);
        }
      } catch (error) {
        outputStream.emit('error', error);
      }
    }
  });

  // Handle end of input stream
  inputStream.on('end', async () => {
    // Translate any remaining text in the buffer
    if (textBuffer.length > 0) {
      try {
        // Create prompt for translation
        let prompt = '';
        if (sourceLang === 'auto' || sourceLang === config.translation.defaultSourceLang) {
          prompt = `Translate the following text to ${targetLang}. Only respond with the translation, no explanations or additional text:\n\n${textBuffer}`;
        } else {
          prompt = `Translate the following text from ${sourceLang} to ${targetLang}. Only respond with the translation, no explanations or additional text:\n\n${textBuffer}`;
        }

        // Use streaming translation
        const streamGenerator = gemini.generateContentStream(prompt);

        for await (const translationChunk of streamGenerator) {
          outputStream.push(translationChunk);
        }
      } catch (error) {
        outputStream.emit('error', error);
      }
    }

    // End the output stream
    outputStream.push(null);
  });

  // Handle errors
  inputStream.on('error', (error) => {
    outputStream.emit('error', error);
    outputStream.push(null);
  });

  return outputStream;
}

/**
 * Get list of supported languages
 * @returns {string[]} - Array of supported language codes
 */
function getSupportedLanguages() {
  return config.supportedLanguages;
}

/**
 * Transcribe audio to text using Gemini Live API
 * @param {Buffer} audioData - Audio data as a buffer
 * @param {string} audioFormat - MIME type of the audio (e.g., 'audio/webm')
 * @returns {Promise<string>} - Transcribed text
 */
async function transcribeAudio(audioData, audioFormat) {
  if (!audioData || !Buffer.isBuffer(audioData)) {
    throw new Error('Audio data must be provided as a Buffer');
  }

  if (!audioFormat) {
    throw new Error('Audio format must be specified');
  }

  try {
    // Use Gemini Live service to transcribe the audio
    const transcription = await geminiLive.transcribeAudio(audioData, audioFormat);
    return transcription.trim();
  } catch (error) {
    // If Gemini Live fails, fall back to regular Gemini API
    logger.error('Gemini Live API failed, falling back to standard Gemini API:', error.message);
    const fallbackTranscription = await gemini.transcribeAudio(audioData, audioFormat);
    return fallbackTranscription.trim();
  }
}

module.exports = {
  translate,
  translateStream,
  transcribeAudio,
  supportedLanguages: getSupportedLanguages()
};
