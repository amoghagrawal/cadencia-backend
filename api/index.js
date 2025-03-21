// Vercel API handler for Express app
const { createServer } = require('http');
const app = require('../dist/index').default;

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