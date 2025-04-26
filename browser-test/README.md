# Live Translation Browser Test

This is a browser-based test for the Live Translation System. It allows you to test both text and voice translation in real-time.

## Features

- Text translation with language selection
- Voice translation with microphone input and Voice Activity Detection (VAD)
- Sample phrases in different languages
- Real-time speech recognition and translation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the test server:
```bash
npm start
```

3. Make sure the main translation API server is running:
```bash
# In the main project directory
npm start
```

4. Open your browser and navigate to:
```
http://localhost:8080
```

## Usage

### Text Translation
1. Select source and target languages
2. Enter text or click on a sample phrase
3. Click "Translate" button

### Voice Translation
1. Select target language
2. Click the microphone button to start recording
3. Speak clearly into your microphone
4. The recognized speech and its translation will appear below
5. Click the microphone button again to stop recording

## Notes

- Voice recognition uses the browser's built-in Speech Recognition API, which may not be available in all browsers
- For best results, use Chrome or Edge
- The browser may ask for permission to access your microphone
- Voice Activity Detection is handled by the browser's Speech Recognition API
