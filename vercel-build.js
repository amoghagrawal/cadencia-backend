// Helper script for Vercel builds
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure the TypeScript compiler is available
try {
  console.log('Vercel build starting...');
  
  // Ensure all dependencies are installed
  console.log('Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  // Compile TypeScript
  console.log('Compiling TypeScript...');
  execSync('npx tsc', { stdio: 'inherit' });
  
  // Check if the dist directory exists
  if (!fs.existsSync(path.join(__dirname, 'dist'))) {
    console.log('Creating dist directory...');
    fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
  }
  
  // Copy package.json to dist
  console.log('Copying package.json to dist...');
  fs.copyFileSync(
    path.join(__dirname, 'package.json'),
    path.join(__dirname, 'dist', 'package.json')
  );
  
  // Create a simple index.js in dist as fallback
  if (!fs.existsSync(path.join(__dirname, 'dist', 'index.js'))) {
    console.log('Warning: dist/index.js not found, creating fallback...');
    fs.writeFileSync(
      path.join(__dirname, 'dist', 'index.js'),
      `
// Fallback Express app - TypeScript compilation failed
const express = require('express');
const app = express();

app.get('*', (req, res) => {
  res.status(500).json({
    error: 'Build Error',
    message: 'The TypeScript compilation failed during build. Please check deployment logs.'
  });
});

exports.default = app;
      `.trim()
    );
  }
  
  console.log('Vercel build completed successfully');
} catch (error) {
  console.error('Vercel build failed:', error);
  process.exit(1);
} 