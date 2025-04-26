/**
 * Simple server to serve the browser test HTML file
 * This allows testing the live translation in a browser
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 8080;

// Enable CORS for the translation API server
app.use(cors());

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Browser test server running at http://localhost:${PORT}`);
  console.log(`Make sure the translation API server is running on port 3001`);
});
