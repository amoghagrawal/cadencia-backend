import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface EnvironmentConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  GROQ_API_KEY: string;
  GROQ_API_URL: string;
  GROQ_MODEL: string;
  SPOTIFY_CLIENT_ID?: string;
  SPOTIFY_CLIENT_SECRET?: string;
}

// Define and export configuration with defaults and validation
export const config: EnvironmentConfig = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GROQ_API_URL: process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1',
  GROQ_MODEL: process.env.GROQ_MODEL || 'llama-3-8b',
  SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
};

/**
 * Validates that all required environment variables are present
 * Throws an error if any required variables are missing
 */
export function validateEnv(): void {
  const requiredEnvVars = [
    'GROQ_API_KEY',
    'GROQ_API_URL',
    'GROQ_MODEL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  console.log('Environment variables validated successfully');
}

export default config; 