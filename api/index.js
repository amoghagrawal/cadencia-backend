// Vercel API handler for Express app
const { createServer } = require('http');
let app;

try {
  // Try to load from dist directory (compiled output)
  app = require('../dist/index').default;
} catch (error) {
  console.error('Error loading Express app:', error.message);
  // Fallback to direct import for local development
  try {
    app = require('../src/index').default;
  } catch (innerError) {
    console.error('Failed to load app from src directory too:', innerError.message);
  }
}

// Create a simple fallback app if everything fails
if (!app) {
  const express = require('express');
  const fallbackApp = express();
  fallbackApp.get('*', (req, res) => {
    res.status(500).json({
      error: 'Failed to load application properly',
      message: 'The server encountered an error while starting. Please check deployment logs.'
    });
  });
  app = fallbackApp;
}

// Ensure that environment variables are set for Vercel
process.env.VERCEL = '1';

// Create a request handler for Vercel
module.exports = (req, res) => {
  // Set CORS headers for API requests
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS requests (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Forward the request to the Express app
  return app(req, res);
}; 