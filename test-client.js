#!/usr/bin/env node

// Simple test client for Cadencia backend API
const axios = require('axios');
const readline = require('readline');

const API_URL = 'http://localhost:3000';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Sleep function for delay between retries
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to make API call with retries
async function makeApiCall(method, url, data = null, retries = MAX_RETRIES) {
  try {
    if (method.toLowerCase() === 'get') {
      return await axios.get(url);
    } else {
      return await axios.post(url, data);
    }
  } catch (error) {
    if (retries > 0) {
      console.log(`Request failed, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
      await sleep(RETRY_DELAY);
      return makeApiCall(method, url, data, retries - 1);
    }
    throw error;
  }
}

// Main function
async function main() {
  console.log('Cadencia API Test Client');
  console.log('-----------------------\n');

  // Verify the server is running
  try {
    const healthCheck = await makeApiCall('get', `${API_URL}/health`);
    console.log(`Server Status: ${healthCheck.data.status}`);
    console.log(`Server Time: ${healthCheck.data.timestamp}\n`);
  } catch (error) {
    console.error('Error connecting to server. Is it running?');
    console.error(`Make sure the server is running at ${API_URL}`);
    process.exit(1);
  }

  // Main interaction loop
  while (true) {
    console.log('\nChoose an option:');
    console.log('1. Analyze mood from text');
    console.log('2. Get music recommendations from text');
    console.log('3. Exit');

    const option = await askQuestion('Enter option (1-3): ');

    switch (option) {
      case '1':
        await analyzeMood();
        break;
      case '2':
        await getRecommendations();
        break;
      case '3':
        rl.close();
        return;
      default:
        console.log('Invalid option. Please try again.');
    }
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

// Function to analyze mood
async function analyzeMood() {
  const text = await askQuestion('\nEnter text to analyze: ');
  
  try {
    console.log('\nAnalyzing mood...');
    const response = await makeApiCall('post', `${API_URL}/api/mood/analyze`, { text });
    
    console.log('\nMood Analysis Result:');
    console.log('--------------------');
    console.log(`Primary Mood: ${response.data.mood}`);
    console.log(`Energy: ${response.data.energy.toFixed(2)}`);
    console.log(`Danceability: ${response.data.danceability.toFixed(2)}`);
    console.log(`Valence (positivity): ${response.data.valence.toFixed(2)}`);
    console.log(`Genres: ${response.data.genres.join(', ')}`);
    console.log(`Descriptors: ${response.data.descriptors.join(', ')}`);
    if (response.data.explanation) {
      console.log(`Explanation: ${response.data.explanation}`);
    }
  } catch (error) {
    console.error('Error analyzing mood:');
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

// Function to get music recommendations
async function getRecommendations() {
  const text = await askQuestion('\nEnter text for recommendations: ');
  const includeGenresInput = await askQuestion('Include genres (comma-separated, or leave blank): ');
  const excludeGenresInput = await askQuestion('Exclude genres (comma-separated, or leave blank): ');
  
  const includeGenres = includeGenresInput.trim() ? includeGenresInput.split(',').map(g => g.trim()) : [];
  const excludeGenres = excludeGenresInput.trim() ? excludeGenresInput.split(',').map(g => g.trim()) : [];
  
  try {
    console.log('\nGetting recommendations...');
    const response = await makeApiCall('post', `${API_URL}/api/mood/recommendations`, {
      text,
      includeGenres,
      excludeGenres
    });
    
    const { moodAnalysis, recommendations } = response.data;
    
    console.log('\nMood Analysis:');
    console.log('-------------');
    console.log(`Primary Mood: ${moodAnalysis.mood}`);
    console.log(`Energy: ${moodAnalysis.energy.toFixed(2)}`);
    console.log(`Valence: ${moodAnalysis.valence.toFixed(2)}`);
    
    console.log('\nMusic Recommendations:');
    console.log('--------------------');
    console.log(`Recommended Genres: ${recommendations.recommendedGenres.join(', ')}`);
    console.log(`Mood Description: ${recommendations.moodDescription}`);
    
    console.log('\nSpotify Parameters:');
    console.log('-----------------');
    Object.entries(recommendations.spotifyParameters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        console.log(`${key}: ${value.join(', ')}`);
      } else if (typeof value === 'number') {
        console.log(`${key}: ${value.toFixed(2)}`);
      } else {
        console.log(`${key}: ${value}`);
      }
    });
  } catch (error) {
    console.error('Error getting recommendations:');
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

// Start the program
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
}); 