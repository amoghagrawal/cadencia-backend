#!/usr/bin/env node

/**
 * A utility script to kill any processes running on the specified port.
 * Usage: node kill-port.js [port]
 * If no port is specified, defaults to 3000
 */

const { execSync } = require('child_process');
const os = require('os');

const port = process.argv[2] || 3000;

console.log(`Attempting to kill processes on port ${port}...`);

try {
  let command;
  
  // Different commands based on operating system
  if (os.platform() === 'win32') {
    // Windows
    command = `@FOR /F "tokens=5" %P IN ('netstat -ano ^| findstr :${port} ^| findstr LISTENING') DO (ECHO Killing process with PID %P && taskkill /F /PID %P)`;
    try {
      execSync(command, { shell: true, stdio: 'inherit' });
    } catch (err) {
      // The command might fail if no processes are found, which is okay
      console.log('No processes found on port or unable to kill process.');
    }
  } else {
    // Unix-based (macOS, Linux)
    try {
      const pid = execSync(`lsof -t -i:${port}`).toString().trim();
      if (pid) {
        execSync(`kill -9 ${pid}`, { stdio: 'inherit' });
        console.log(`Killed process ${pid}`);
      }
    } catch (err) {
      console.log('No processes found on port or unable to kill process.');
    }
  }
  
  console.log(`Checked for processes using port ${port}.`);
} catch (error) {
  console.error('Error executing command:', error.message);
  process.exit(1);
} 