#!/usr/bin/env node

// Test client for Cadencia Spotify integration
const axios = require('axios');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000';
const CONFIG_FILE = path.join(__dirname, 'spotify-config.json');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Store Spotify user ID between runs
let savedUserId = null;

// Try to load saved user ID
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    savedUserId = config.userId;
  }
} catch (error) {
  console.error('Error loading config:', error.message);
}

// Function to save user ID
function saveUserId(userId) {
  if (!userId) return;
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ userId }, null, 2));
    console.log(`User ID saved to ${CONFIG_FILE}`);
  } catch (error) {
    console.error('Error saving config:', error.message);
  }
}

// Sleep function for delay
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to make API call with retries
async function makeApiCall(method, url, data = null, retries = 3) {
  try {
    if (method.toLowerCase() === 'get') {
      return await axios.get(url);
    } else {
      return await axios.post(url, data);
    }
  } catch (error) {
    if (retries > 0) {
      console.log(`Request failed, retrying... (${3 - retries + 1}/3)`);
      await sleep(1000);
      return makeApiCall(method, url, data, retries - 1);
    }
    throw error;
  }
}

// Function to ask a question and get input
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Function to authenticate with Spotify
async function authenticateSpotify() {
  console.log('\nSpotify Authentication');
  console.log('----------------------');
  
  if (savedUserId) {
    const useExisting = await askQuestion(`Found saved user ID: ${savedUserId}. Use this? (y/n): `);
    if (useExisting.toLowerCase() === 'y') {
      return savedUserId;
    }
  }
  
  console.log('\nTo authenticate with Spotify, you need to:');
  console.log('1. Visit the Spotify authorization URL in your browser');
  console.log('2. Log in to Spotify and grant permission');
  console.log('3. You will be redirected to our callback URL');
  console.log('4. Copy the userId from the response and paste it here\n');
  
  const openUrl = await askQuestion(`Open Spotify login URL in your browser? (y/n): `);
  
  if (openUrl.toLowerCase() === 'y') {
    console.log(`\nOpening: ${API_URL}/api/spotify/login\n`);
    // On a real system we'd open the browser automatically
    console.log(`Please copy and paste this URL in your browser:\n${API_URL}/api/spotify/login\n`);
  } else {
    console.log(`\nPlease visit this URL: ${API_URL}/api/spotify/login\n`);
  }
  
  const userId = await askQuestion('After authorizing, enter the userId from the response: ');
  
  if (userId) {
    saveUserId(userId);
    return userId;
  }
  
  throw new Error('Authentication failed. No user ID provided.');
}

// Function to search for tracks
async function searchTracks(userId) {
  const query = await askQuestion('\nEnter search query: ');
  
  try {
    console.log('\nSearching for tracks...');
    const response = await makeApiCall(
      'get',
      `${API_URL}/api/spotify/search?userId=${encodeURIComponent(userId)}&query=${encodeURIComponent(query)}`
    );
    
    console.log('\nSearch Results:');
    console.log('---------------');
    
    if (response.data.tracks.length === 0) {
      console.log('No tracks found matching your query.');
      return null;
    }
    
    response.data.tracks.forEach((track, index) => {
      console.log(`${index + 1}. "${track.name}" by ${track.artists.map(a => a.name).join(', ')}`);
    });
    
    return response.data.tracks;
  } catch (error) {
    console.error('Error searching for tracks:');
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
    return null;
  }
}

// Function to get recommendations
async function getRecommendations(userId) {
  console.log('\nGetting Music Recommendations');
  console.log('----------------------------');
  
  const useText = await askQuestion('Use text input for mood analysis? (y/n): ');
  
  if (useText.toLowerCase() === 'y') {
    return getRecommendationsFromText(userId);
  } else {
    return getRecommendationsFromMood(userId);
  }
}

// Function to get recommendations from text
async function getRecommendationsFromText(userId) {
  const text = await askQuestion('\nEnter text for mood analysis: ');
  const includeGenresInput = await askQuestion('Include genres (comma-separated, or leave blank): ');
  const excludeGenresInput = await askQuestion('Exclude genres (comma-separated, or leave blank): ');
  const createPlaylist = await askQuestion('Create a Spotify playlist? (y/n): ');
  
  const includeGenres = includeGenresInput.trim() ? includeGenresInput.split(',').map(g => g.trim()) : [];
  const excludeGenres = excludeGenresInput.trim() ? excludeGenresInput.split(',').map(g => g.trim()) : [];
  
  try {
    console.log('\nAnalyzing text and getting recommendations...');
    const response = await makeApiCall(
      'post',
      `${API_URL}/api/music/recommendations-from-text`,
      {
        text,
        userId,
        includeGenres,
        excludeGenres,
        generatePlaylist: createPlaylist.toLowerCase() === 'y',
        playlistName: createPlaylist.toLowerCase() === 'y' ? `Cadencia: ${text.substring(0, 20)}...` : undefined,
        playlistDescription: createPlaylist.toLowerCase() === 'y' ? `Created by Cadencia based on: "${text}"` : undefined
      }
    );
    
    console.log('\nMood Analysis:');
    console.log('-------------');
    console.log(`Primary Mood: ${response.data.moodAnalysis.mood}`);
    console.log(`Energy: ${response.data.moodAnalysis.energy.toFixed(2)}`);
    console.log(`Valence: ${response.data.moodAnalysis.valence.toFixed(2)}`);
    console.log(`Danceability: ${response.data.moodAnalysis.danceability.toFixed(2)}`);
    
    console.log('\nRecommended Tracks:');
    console.log('------------------');
    
    if (response.data.tracks.length === 0) {
      console.log('No tracks found matching your mood.');
    } else {
      response.data.tracks.forEach((track, index) => {
        console.log(`${index + 1}. "${track.name}" by ${track.artists.map(a => a.name).join(', ')}`);
      });
    }
    
    if (response.data.playlist) {
      console.log('\nPlaylist Created:');
      console.log('----------------');
      console.log(`Name: ${response.data.playlist.name}`);
      console.log(`Description: ${response.data.playlist.description}`);
      console.log(`URL: ${response.data.playlist.external_urls.spotify}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error getting recommendations from text:');
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
    return null;
  }
}

// Function to get recommendations from mood
async function getRecommendationsFromMood(userId) {
  console.log('\nEnter mood parameters (values between 0 and 1):');
  const mood = await askQuestion('Mood description (e.g., happy, sad, energetic): ');
  const energy = parseFloat(await askQuestion('Energy (0-1): '));
  const valence = parseFloat(await askQuestion('Valence/Positivity (0-1): '));
  const danceability = parseFloat(await askQuestion('Danceability (0-1): '));
  const genresInput = await askQuestion('Genres (comma-separated, or leave blank): ');
  const createPlaylist = await askQuestion('Create a Spotify playlist? (y/n): ');
  
  const genres = genresInput.trim() ? genresInput.split(',').map(g => g.trim()) : [];
  
  try {
    console.log('\nGetting recommendations based on mood...');
    const response = await makeApiCall(
      'post',
      `${API_URL}/api/music/recommendations-from-mood`,
      {
        userId,
        mood,
        energy,
        valence,
        danceability,
        genres,
        generatePlaylist: createPlaylist.toLowerCase() === 'y',
        playlistName: createPlaylist.toLowerCase() === 'y' ? `Cadencia: ${mood} Mood` : undefined,
        playlistDescription: createPlaylist.toLowerCase() === 'y' ? `Created by Cadencia based on ${mood} mood` : undefined
      }
    );
    
    console.log('\nRecommended Tracks:');
    console.log('------------------');
    
    if (response.data.tracks.length === 0) {
      console.log('No tracks found matching your mood.');
    } else {
      response.data.tracks.forEach((track, index) => {
        console.log(`${index + 1}. "${track.name}" by ${track.artists.map(a => a.name).join(', ')}`);
      });
    }
    
    if (response.data.playlist) {
      console.log('\nPlaylist Created:');
      console.log('----------------');
      console.log(`Name: ${response.data.playlist.name}`);
      console.log(`Description: ${response.data.playlist.description}`);
      console.log(`URL: ${response.data.playlist.external_urls.spotify}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error getting recommendations from mood:');
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
    return null;
  }
}

// Main function
async function main() {
  console.log('Cadencia Spotify Test Client');
  console.log('---------------------------\n');

  // Verify the server is running
  try {
    const healthCheck = await makeApiCall('get', `${API_URL}/health`);
    console.log(`Server Status: ${healthCheck.data.status || 'OK'}`);
    console.log(`Server Time: ${healthCheck.data.timestamp || new Date().toISOString()}`);
    
    // Check if Spotify services info is available
    if (healthCheck.data.services) {
      if (!healthCheck.data.services.spotify) {
        console.warn('WARNING: Spotify service is not properly configured on the server.');
        console.warn('Check your SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env file.\n');
      }
    }
  } catch (error) {
    console.error('Error connecting to server. Is it running?');
    console.error(`Make sure the server is running at ${API_URL}`);
    process.exit(1);
  }

  // Get or authenticate Spotify user
  let userId;
  try {
    userId = await authenticateSpotify();
    console.log(`\nAuthenticated with Spotify for user: ${userId}`);
  } catch (error) {
    console.error('Authentication failed:', error.message);
    rl.close();
    return;
  }

  // Main interaction loop
  while (true) {
    console.log('\nChoose an option:');
    console.log('1. Search for tracks');
    console.log('2. Get music recommendations');
    console.log('3. Exit');

    const option = await askQuestion('Enter option (1-3): ');

    switch (option) {
      case '1':
        await searchTracks(userId);
        break;
      case '2':
        await getRecommendations(userId);
        break;
      case '3':
        rl.close();
        return;
      default:
        console.log('Invalid option. Please try again.');
    }
  }
}

// Start the program
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});