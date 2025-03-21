#!/usr/bin/env node

// Script to test AI response quality with different inputs
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = 'http://localhost:3000';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Test cases
const TEST_CASES = [
  { 
    label: 'Happy mood',
    text: 'I\'m feeling really excited today! Everything seems to be going well and I can\'t wait to see what the day brings.'
  },
  {
    label: 'Sad mood',
    text: 'I\'ve been feeling down all day. Nothing seems to be going right and I just want to curl up and sleep.'
  },
  {
    label: 'Relaxed mood',
    text: 'I feel so peaceful and calm right now. Just sitting by the window with a cup of tea, watching the rain fall.'
  },
  {
    label: 'Angry mood',
    text: 'This is so frustrating! I can\'t believe they would do this to me. I\'m absolutely fuming right now.'
  },
  {
    label: 'Mixed emotions',
    text: 'Today is bittersweet. I got a new job offer but it means moving away from my friends and family.'
  },
  {
    label: 'Neutral statement',
    text: 'I took my dog for a walk in the park and then went grocery shopping for dinner.'
  },
  {
    label: 'Detailed emotional scenario',
    text: 'Last night I attended my best friend\'s wedding. Seeing them so happy made me cry tears of joy, but I also felt a little lonely, wondering when I\'ll find my own happiness. The music was upbeat and everyone was dancing.'
  }
];

// Create results directory if it doesn't exist
const resultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir);
}

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

// Function to test each case
async function testCase(testCase) {
  console.log(`\nTesting: ${testCase.label}`);
  console.log(`Input: "${testCase.text.substring(0, 50)}${testCase.text.length > 50 ? '...' : ''}"`);
  
  try {
    // Call analyze endpoint
    console.time('analysis-time');
    const response = await makeApiCall('post', `${API_URL}/api/mood/analyze`, { text: testCase.text });
    console.timeEnd('analysis-time');
    
    const result = response.data;
    
    // Print summary
    console.log('Results:');
    console.log(`- Mood: ${result.mood}`);
    console.log(`- Energy: ${result.energy.toFixed(2)}`);
    console.log(`- Valence: ${result.valence.toFixed(2)}`);
    console.log(`- Danceability: ${result.danceability.toFixed(2)}`);
    console.log(`- Genres: ${result.genres.join(', ')}`);
    console.log(`- Descriptors: ${result.descriptors.join(', ')}`);
    if (result.explanation) {
      console.log(`- Explanation: ${result.explanation}`);
    }
    
    // Save detailed results to file
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `${testCase.label.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.json`;
    fs.writeFileSync(
      path.join(resultsDir, filename),
      JSON.stringify({
        testCase,
        result,
        analysisTime: new Date().toISOString()
      }, null, 2)
    );
    
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to evaluate result consistency
function evaluateConsistency(results) {
  console.log('\n--- CONSISTENCY EVALUATION ---');
  
  // Check if mood matches the expected sentiment
  for (let i = 0; i < results.length; i++) {
    const testCase = TEST_CASES[i];
    const result = results[i];
    
    if (!result.success) continue;
    
    // Simple validation checks
    if (testCase.label.includes('Happy') && result.result.valence < 0.5) {
      console.log(`⚠️ Inconsistency: ${testCase.label} has low valence (${result.result.valence.toFixed(2)})`);
    }
    
    if (testCase.label.includes('Sad') && result.result.valence > 0.5) {
      console.log(`⚠️ Inconsistency: ${testCase.label} has high valence (${result.result.valence.toFixed(2)})`);
    }
    
    if (testCase.label.includes('Relaxed') && result.result.energy > 0.5) {
      console.log(`⚠️ Inconsistency: ${testCase.label} has high energy (${result.result.energy.toFixed(2)})`);
    }
    
    if (testCase.label.includes('Angry') && result.result.valence > 0.4) {
      console.log(`⚠️ Inconsistency: ${testCase.label} has high valence (${result.result.valence.toFixed(2)})`);
    }
  }
  
  console.log('Consistency evaluation complete');
}

// Main function to run tests
async function runTests() {
  console.log('Starting AI quality tests...');
  console.log(`Testing against: ${API_URL}`);
  console.log(`Number of test cases: ${TEST_CASES.length}`);
  
  // Check if server is running
  try {
    const healthCheck = await makeApiCall('get', `${API_URL}/health`);
    console.log(`Server status: ${healthCheck.data.status}`);
  } catch (error) {
    console.error('Error connecting to server. Is it running?');
    return;
  }
  
  // Run all test cases
  const results = [];
  for (const test of TEST_CASES) {
    const result = await testCase(test);
    results.push(result);
  }
  
  // Evaluate consistency
  evaluateConsistency(results);
  
  // Summary
  const successCount = results.filter(r => r.success).length;
  console.log(`\nTest complete. ${successCount}/${TEST_CASES.length} tests passed.`);
  console.log(`Results saved to: ${resultsDir}`);
}

// Run tests
runTests().catch(error => {
  console.error('Unexpected error during tests:', error);
  process.exit(1);
}); 