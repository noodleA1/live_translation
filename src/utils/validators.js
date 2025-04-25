/**
 * Validation utilities for the Live Translation System
 */

const config = require('../config');

/**
 * Validate language code
 * @param {string} langCode - Language code to validate
 * @returns {boolean} - True if language is supported
 */
function isValidLanguage(langCode) {
  if (!langCode) return false;
  return config.supportedLanguages.includes(langCode);
}

/**
 * Validate translation request parameters
 * @param {Object} params - Request parameters
 * @param {string} params.text - Text to translate
 * @param {string} params.targetLang - Target language code
 * @param {string} params.sourceLang - Source language code (optional)
 * @returns {Object} - Validation result with isValid and errors
 */
function validateTranslationRequest(params) {
  const errors = [];
  
  // Check required parameters
  if (!params.text) {
    errors.push('Text is required for translation');
  }
  
  if (!params.targetLang) {
    errors.push('Target language is required');
  } else if (!isValidLanguage(params.targetLang)) {
    errors.push(`Target language '${params.targetLang}' is not supported`);
  }
  
  // Check optional parameters
  if (params.sourceLang && 
      params.sourceLang !== 'auto' && 
      !isValidLanguage(params.sourceLang)) {
    errors.push(`Source language '${params.sourceLang}' is not supported`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  isValidLanguage,
  validateTranslationRequest
};