#!/usr/bin/env node

/**
 * Script to update the Spotify client URLs to point to a deployed backend
 * Usage: node update-client-url.js [vercel-url]
 */

const fs = require('fs');
const path = require('path');

// Get the Vercel URL from command line arguments
const vercelUrl = process.argv[2];

if (!vercelUrl) {
  console.error('Please provide a Vercel URL as an argument');
  console.error('Example: node update-client-url.js https://your-app-name.vercel.app');
  process.exit(1);
}

// Validate URL format
try {
  new URL(vercelUrl);
} catch (error) {
  console.error('Invalid URL format. Please provide a valid URL.');
  console.error('Example: node update-client-url.js https://your-app-name.vercel.app');
  process.exit(1);
}

// Path to Spotify client file
const spotifyClientPath = path.join(__dirname, 'spotify-client.js');

// Read the file
try {
  const fileContent = fs.readFileSync(spotifyClientPath, 'utf8');
  
  // Replace the API_URL
  const updatedContent = fileContent.replace(
    /const API_URL = ['"](.+)['"]/,
    `const API_URL = '${vercelUrl}'`
  );
  
  // Write the updated content
  fs.writeFileSync(spotifyClientPath, updatedContent);
  
  console.log(`✅ Successfully updated spotify-client.js to use ${vercelUrl}`);
  console.log(`\nTo use the Spotify client with your deployed backend:`);
  console.log(`1. Update your Spotify Developer Dashboard Redirect URI:`);
  console.log(`   - Go to https://developer.spotify.com/dashboard/applications`);
  console.log(`   - Select your app and go to "Edit Settings"`);
  console.log(`   - Add "${vercelUrl}/api/spotify/callback" to the Redirect URIs`);
  console.log(`2. Make sure your Vercel deployment has the following environment variables set:`);
  console.log(`   - BASE_URL="${vercelUrl}"`);
  console.log(`   - SPOTIFY_REDIRECT_URI="${vercelUrl}/api/spotify/callback"`);
  console.log(`   - SPOTIFY_CLIENT_ID`);
  console.log(`   - SPOTIFY_CLIENT_SECRET`);
  console.log(`   - GROQ_API_KEY`);
  console.log(`   - GROQ_API_URL`);
  console.log(`   - GROQ_MODEL`);
  
} catch (error) {
  console.error(`Error updating spotify-client.js: ${error.message}`);
  process.exit(1);
} 