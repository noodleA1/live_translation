# Live Translation System

A real-time translation system built with Node.js and Google's Gemini API that can translate text between multiple languages.

## Features

- Real-time translation using Google's Gemini AI
- Support for 25+ languages
- Streaming translation for real-time responses
- Simple API for integration

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/live-translation-system.git
cd live-translation-system

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env
```

## Configuration

Edit the `.env` file and add your Gemini API key:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

You can obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

## Usage

### As a Module

```javascript
const translator = require('./src/index');

// Translate text
async function translateText() {
  const translated = await translator.translate('Hello, world!', 'es');
  console.log(translated); // Outputs: "¡Hola, mundo!"
}

// Stream translation
const { Readable } = require('stream');
const inputStream = new Readable();
inputStream.push('Hello, world!');
inputStream.push(null);

const outputStream = translator.translateStream(inputStream, 'fr');
outputStream.on('data', chunk => console.log(chunk.toString()));
```

### As an API Server

```bash
# Start the API server
npm start
```

## API Documentation

The translation system provides both RESTful API and WebSocket interfaces that can be used to integrate translation capabilities into your applications. The server runs on port 3001 by default.

## REST API Endpoints

### Health Check

Check if the API server is running.

- **URL**: `/health`
- **Method**: `GET`
- **Response**: `{ "status": "ok" }`

**Example with curl**:
```bash
curl http://localhost:3001/health
```

### Get Supported Languages

Get a list of all supported language codes.

- **URL**: `/languages`
- **Method**: `GET`
- **Response**: `{ "languages": ["en", "es", "fr", ...] }`

**Example with curl**:
```bash
curl http://localhost:3001/languages
```

### Translate Text

Translate text from one language to another.

- **URL**: `/translate`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "text": "Hello, world!",
    "targetLang": "es",
    "sourceLang": "en"  // Optional, defaults to "auto"
  }
  ```
- **Response**:
  ```json
  {
    "original": "Hello, world!",
    "translated": "¡Hola, mundo!",
    "sourceLang": "en",
    "targetLang": "es"
  }
  ```

**Example with curl**:
```bash
curl -X POST http://localhost:3001/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, world!", "targetLang": "es", "sourceLang": "en"}'
```

**Example with auto-detection**:
```bash
curl -X POST http://localhost:3001/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, world!", "targetLang": "es"}'
```

### Transcribe Audio

Transcribe audio to text using Gemini AI.

- **URL**: `/transcribe`
- **Method**: `POST`
- **Content-Type**: One of `audio/webm`, `audio/wav`, `audio/mp3`, `audio/mpeg`, `audio/ogg`
- **Request Body**: Raw audio data (binary)
- **Response**:
  ```json
  {
    "transcription": "The transcribed text from the audio",
    "contentType": "audio/webm"
  }
  ```

**Example with curl**:
```bash
# Transcribe a webm audio file
curl -X POST http://localhost:3001/transcribe \
  -H "Content-Type: audio/webm" \
  --data-binary @/path/to/your/audio.webm
```

## WebSocket API

The WebSocket API provides real-time audio transcription and translation capabilities. It's designed for streaming audio data and receiving transcriptions and translations in real-time.

### WebSocket Connection

Connect to the WebSocket server at:

```
ws://localhost:3001
```

### WebSocket Messages

The WebSocket API uses JSON messages for communication. Each message has a `type` field that indicates the message type.

#### Client to Server Messages

##### Start Transcription

Start a new transcription session:

```json
{
  "type": "start",
  "format": "audio/webm"
}
```

##### Set Target Language

Set the target language for translation:

```json
{
  "type": "setLanguage",
  "language": "es"
}
```

##### Stop Transcription

Stop the current transcription session:

```json
{
  "type": "stop"
}
```

##### Send Audio Data

Send audio data as binary WebSocket messages. The audio data should be in the format specified in the "start" message.

#### Server to Client Messages

##### Session Established

Sent when a new WebSocket session is established:

```json
{
  "type": "session",
  "sessionId": "unique-session-id"
}
```

##### Transcription Result

Sent when a transcription is available:

```json
{
  "type": "transcription",
  "text": "The transcribed text"
}
```

##### Translation Result

Sent when a translation is available:

```json
{
  "type": "translation",
  "text": "The translated text",
  "sourceText": "The original text",
  "targetLanguage": "es"
}
```

##### Error Message

Sent when an error occurs:

```json
{
  "type": "error",
  "error": "Error message"
}
```

### WebSocket Example (JavaScript)

```javascript
// Connect to WebSocket server
const socket = new WebSocket('ws://localhost:3001');

// Connection opened
socket.addEventListener('open', (event) => {
  console.log('WebSocket connected');

  // Start transcription
  socket.send(JSON.stringify({
    type: 'start',
    format: 'audio/webm'
  }));

  // Set target language
  socket.send(JSON.stringify({
    type: 'setLanguage',
    language: 'es'
  }));
});

// Listen for messages
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'transcription':
      console.log('Transcription:', message.text);
      break;

    case 'translation':
      console.log('Translation:', message.text);
      break;

    case 'error':
      console.error('Error:', message.error);
      break;
  }
});

// Send audio data
function sendAudioData(audioBlob) {
  socket.send(audioBlob);
}

// Stop transcription
function stopTranscription() {
  socket.send(JSON.stringify({
    type: 'stop'
  }));
}
```

## Complete Translation Workflow

### REST API Workflow

To perform a complete voice translation workflow using the REST API:

1. Capture audio from the user
2. Send the audio to the `/transcribe` endpoint
3. Extract the transcription from the response
4. Send the transcription to the `/translate` endpoint
5. Extract the translation from the response
6. Display or speak the translated text

**Example with curl**:
```bash
# Step 1: Transcribe audio
RESPONSE=$(curl -s -X POST http://localhost:3001/transcribe \
  -H "Content-Type: audio/webm" \
  --data-binary @/path/to/your/audio.webm)

# Step 2: Extract the transcription
TRANSCRIPTION=$(echo $RESPONSE | jq -r '.transcription')
echo "Transcribed text: $TRANSCRIPTION"

# Step 3: Translate the transcription
TRANSLATION_RESPONSE=$(curl -s -X POST http://localhost:3001/translate \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"$TRANSCRIPTION\", \"targetLang\": \"es\"}")

# Step 4: Extract the translation
TRANSLATION=$(echo $TRANSLATION_RESPONSE | jq -r '.translated')
echo "Translated text: $TRANSLATION"
```

**Example with JavaScript**:
```javascript
// Step 1: Transcribe audio
async function transcribeAudio(audioBlob) {
  const response = await fetch('http://localhost:3001/transcribe', {
    method: 'POST',
    headers: {
      'Content-Type': audioBlob.type
    },
    body: audioBlob
  });

  const data = await response.json();

  // Step 2: Extract the transcription
  const transcription = data.transcription;
  console.log('Transcribed text:', transcription);

  // Step 3: Translate the transcription
  const translationResponse = await fetch('http://localhost:3001/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: transcription,
      targetLang: 'es'
    })
  });

  const translationData = await translationResponse.json();

  // Step 4: Extract the translation
  const translation = translationData.translated;
  console.log('Translated text:', translation);

  return {
    transcription,
    translation
  };
}
```

### WebSocket Workflow

To perform a complete voice translation workflow using the WebSocket API:

1. Connect to the WebSocket server
2. Send a "start" message to start transcription
3. Send a "setLanguage" message to set the target language
4. Stream audio data as binary WebSocket messages
5. Listen for and extract transcription and translation results from the received messages
6. Send a "stop" message when done

**Example with JavaScript**:
```javascript
// Connect to WebSocket server
const socket = new WebSocket('ws://localhost:3001');
let transcription = '';
let translation = '';

// Connection opened
socket.addEventListener('open', (event) => {
  console.log('WebSocket connected');

  // Start transcription
  socket.send(JSON.stringify({
    type: 'start',
    format: 'audio/webm'
  }));

  // Set target language
  socket.send(JSON.stringify({
    type: 'setLanguage',
    language: 'es'
  }));
});

// Listen for messages
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'transcription':
      // Extract the transcription
      transcription = message.text;
      console.log('Transcribed text:', transcription);

      // Update UI with transcription
      document.getElementById('transcription').textContent = transcription;
      break;

    case 'translation':
      // Extract the translation
      translation = message.text;
      console.log('Translated text:', translation);

      // Update UI with translation
      document.getElementById('translation').textContent = translation;
      break;

    case 'error':
      console.error('Error:', message.error);
      break;
  }
});

// Function to send audio data
function sendAudioData(audioBlob) {
  socket.send(audioBlob);
}

// Function to stop transcription
function stopTranscription() {
  socket.send(JSON.stringify({
    type: 'stop'
  }));

  // At this point, transcription and translation variables contain the final results
  console.log('Final transcription:', transcription);
  console.log('Final translation:', translation);
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `500 Internal Server Error`: Server-side error

Error responses include a JSON object with an `error` field containing a description of the error:

```json
{
  "error": "Description of the error"
}
```

### Browser Test

A browser-based test interface is available in the `browser-test` directory. This allows you to test both text and voice translation with a user-friendly interface.

```bash
# Navigate to the browser test directory
cd browser-test

# Install dependencies
npm install

# Start the test server
npm start
```

Then open your browser to `http://localhost:8080`. Make sure the main translation API server is also running.

## System Architecture

The Live Translation System is built with a modular architecture that separates concerns and makes it easy to extend or modify functionality.

### Core Components

1. **API Server** (`src/api/server.js`)
   - Express.js server that handles HTTP requests
   - Provides RESTful endpoints for translation and transcription
   - Handles error cases and validation

2. **Translation Service** (`src/translators/index.js`)
   - Core translation logic
   - Handles text translation, streaming translation, and audio transcription
   - Validates inputs and formats outputs

3. **Gemini Service** (`src/services/gemini.js`)
   - Wrapper around Google's Gemini AI API
   - Handles communication with Gemini for text generation and audio transcription
   - Manages API requests and error handling

4. **Configuration** (`src/config/index.js`)
   - Centralizes configuration settings
   - Loads environment variables
   - Defines defaults and constants

5. **Browser Test** (`browser-test/index.html`)
   - Web interface for testing the translation system
   - Provides text and voice input options
   - Demonstrates integration with the API

### Data Flow

1. **Text Translation**:
   ```
   Client → API Server → Translation Service → Gemini Service → Gemini API → Response
   ```

2. **Audio Transcription**:
   ```
   Client → API Server → Translation Service → Gemini Service → Gemini API → Response
   ```

3. **Voice Translation**:
   ```
   Client → Capture Audio → API Server (Transcribe) → API Server (Translate) → Response
   ```

### Voice Activity Detection (VAD)

The browser test includes a custom Voice Activity Detection (VAD) implementation that:

1. Captures audio using WebRTC
2. Analyzes audio levels in real-time
3. Detects when speech starts and stops
4. Sends audio segments for transcription only when speech is detected

This approach reduces unnecessary API calls and improves the user experience by only processing relevant audio.

## Supported Languages

The system supports the following languages:

- Arabic (ar)
- Bengali (bn)
- German (de)
- English (en)
- Spanish (es)
- French (fr)
- Gujarati (gu)
- Hindi (hi)
- Indonesian (id)
- Italian (it)
- Japanese (ja)
- Kannada (kn)
- Korean (ko)
- Malayalam (ml)
- Marathi (mr)
- Dutch (nl)
- Polish (pl)
- Portuguese (pt)
- Russian (ru)
- Tamil (ta)
- Telugu (te)
- Thai (th)
- Turkish (tr)
- Vietnamese (vi)
- Mandarin Chinese (cmn)

## Extending the System

### Adding New Languages

To add support for new languages, update the `supportedLanguages` array in `src/config/index.js`.

### Adding New Features

The modular architecture makes it easy to add new features:

1. **New API Endpoints**: Add new routes to `src/api/server.js`
2. **New Translation Methods**: Add new functions to `src/translators/index.js`
3. **New AI Capabilities**: Extend the Gemini service in `src/services/gemini.js`

## License

MIT