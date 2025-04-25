/**
 * Configuration settings for the Live Translation System
 */

require('dotenv').config();

module.exports = {
  // Gemini API configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  },
  
  // Server configuration (if using API server)
  server: {
    port: process.env.PORT || 3000,
  },
  
  // Default translation settings
  translation: {
    defaultSourceLang: 'auto', // Auto-detect source language
    defaultTargetLang: 'en',   // English as default target
  },
  
  // Supported languages (ISO 639-1 codes)
  // Based on Gemini's supported languages
  supportedLanguages: [
    'ar', 'bn', 'de', 'en', 'es', 'fr', 'gu', 'hi', 'id', 'it', 
    'ja', 'kn', 'ko', 'ml', 'mr', 'nl', 'pl', 'pt', 'ru', 'ta', 
    'te', 'th', 'tr', 'vi', 'cmn' // cmn is Mandarin Chinese
  ]
};