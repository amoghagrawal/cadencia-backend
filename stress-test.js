#!/usr/bin/env node

// Stress test script for the Cadencia backend API
const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:3000';
const CONCURRENT_REQUESTS = 5;
const TOTAL_REQUESTS = 20;
const REQUEST_DELAY_MS = 100; // Delay between batches
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Test inputs - varying complexity
const TEST_INPUTS = [
  'I feel happy today!',
  'I am feeling quite sad and melancholic right now.',
  'This music makes me feel energetic and ready to dance!',
  'I am feeling so relaxed and calm after my meditation session.'
];

// Stats tracking
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalResponseTime: 0,
  minResponseTime: Number.MAX_SAFE_INTEGER,
  maxResponseTime: 0,
  startTime: null,
  endTime: null,
  responses: []
};

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
      // Silent retry for stress test to avoid cluttering output
      await sleep(RETRY_DELAY);
      return makeApiCall(method, url, data, retries - 1);
    }
    throw error;
  }
}

// Function to make a single request
async function makeRequest() {
  const input = TEST_INPUTS[Math.floor(Math.random() * TEST_INPUTS.length)];
  const startTime = Date.now();
  
  try {
    const response = await makeApiCall('post', `${API_URL}/api/mood/analyze`, { text: input });
    const responseTime = Date.now() - startTime;
    
    stats.totalRequests++;
    stats.successfulRequests++;
    stats.totalResponseTime += responseTime;
    stats.minResponseTime = Math.min(stats.minResponseTime, responseTime);
    stats.maxResponseTime = Math.max(stats.maxResponseTime, responseTime);
    
    stats.responses.push({
      input,
      responseTime,
      mood: response.data.mood,
      energy: response.data.energy,
      valence: response.data.valence
    });
    
    process.stdout.write('.');
    return { success: true, time: responseTime };
  } catch (error) {
    stats.totalRequests++;
    stats.failedRequests++;
    
    process.stdout.write('F');
    return { 
      success: false, 
      error: error.message,
      status: error.response?.status || 'unknown'
    };
  }
}

// Function to run a batch of concurrent requests
async function runBatch(batchSize) {
  const promises = [];
  for (let i = 0; i < batchSize; i++) {
    promises.push(makeRequest());
  }
  return Promise.all(promises);
}

// Main function to run the stress test
async function runStressTest() {
  console.log(`Starting stress test against ${API_URL}`);
  console.log(`Concurrent requests per batch: ${CONCURRENT_REQUESTS}`);
  console.log(`Total requests: ${TOTAL_REQUESTS}`);
  console.log(`\nProgress: `);
  
  // Check if the server is running
  try {
    await makeApiCall('get', `${API_URL}/health`);
  } catch (error) {
    console.error('Error: Server is not running or not accessible');
    return;
  }
  
  stats.startTime = Date.now();
  
  // Run batches until we reach the total number of requests
  let completedRequests = 0;
  while (completedRequests < TOTAL_REQUESTS) {
    const batchSize = Math.min(CONCURRENT_REQUESTS, TOTAL_REQUESTS - completedRequests);
    await runBatch(batchSize);
    completedRequests += batchSize;
    
    // Add a small delay between batches to prevent rate limiting
    if (completedRequests < TOTAL_REQUESTS) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS));
    }
  }
  
  stats.endTime = Date.now();
  
  // Print results
  const totalDuration = stats.endTime - stats.startTime;
  const avgResponseTime = stats.successfulRequests > 0 
    ? stats.totalResponseTime / stats.successfulRequests 
    : 0;
  
  console.log('\n\n--- STRESS TEST RESULTS ---');
  console.log(`Total time: ${(totalDuration / 1000).toFixed(2)} seconds`);
  console.log(`Requests: ${stats.totalRequests} total, ${stats.successfulRequests} successful, ${stats.failedRequests} failed`);
  console.log(`Success rate: ${(stats.successfulRequests / stats.totalRequests * 100).toFixed(2)}%`);
  console.log(`Requests per second: ${(stats.totalRequests / (totalDuration / 1000)).toFixed(2)}`);
  console.log(`Average response time: ${avgResponseTime.toFixed(2)} ms`);
  console.log(`Min response time: ${stats.minResponseTime} ms`);
  console.log(`Max response time: ${stats.maxResponseTime} ms`);
  
  // Analyze response patterns
  const moodCounts = {};
  stats.responses.forEach(response => {
    if (!response.mood) return;
    moodCounts[response.mood] = (moodCounts[response.mood] || 0) + 1;
  });
  
  console.log('\nMood distribution:');
  Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).forEach(([mood, count]) => {
    const percentage = (count / stats.successfulRequests * 100).toFixed(1);
    console.log(`- ${mood}: ${count} (${percentage}%)`);
  });
}

// Run the stress test
runStressTest().catch(error => {
  console.error('Unexpected error during stress test:', error);
  process.exit(1);
}); 