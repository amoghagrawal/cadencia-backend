import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { validateEnv } from './config/env';
import { moodRoutes } from './routes/moodRoutes';
import spotifyRoutes from './routes/spotifyRoutes';
import { musicRoutes } from './routes/musicRoutes';

// Load environment variables
dotenv.config();

// Validate environment variables
validateEnv();

// Initialize express app
const app = express();
const DEFAULT_PORT = parseInt(process.env.PORT || '3000', 10);
const MAX_PORT_ATTEMPTS = 10;

// Middleware
app.use(express.json());
app.use(cors());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      mood: true,
      spotify: !!process.env.SPOTIFY_CLIENT_ID && !!process.env.SPOTIFY_CLIENT_SECRET,
      music: true
    }
  });
});

// Routes
app.use('/api/mood', moodRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/music', musicRoutes);

// Error handling middleware
interface ErrorResponse {
  message: string;
  stack?: string;
  statusCode?: number;
}

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const statusCode = 'statusCode' in err ? (err as ErrorResponse).statusCode || 500 : 500;
  
  console.error(`[ERROR] ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Handle 404 routes
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
  });
});

// Function to try starting the server on an available port
function startServer(port: number, maxAttempts: number): void {
  const server = createServer(app);
  
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying port ${port + 1}...`);
      if (maxAttempts > 0) {
        startServer(port + 1, maxAttempts - 1);
      } else {
        console.error('Could not find an available port. Please close some applications and try again.');
        process.exit(1);
      }
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
  
  server.listen(port, () => {
    console.log(`Server running on port ${port} in ${process.env.NODE_ENV} mode`);
    
    // Log API endpoints available
    console.log('\nAvailable API Endpoints:');
    console.log('- Mood Analysis: POST /api/mood/analyze');
    console.log('- Basic Recommendations: POST /api/mood/recommendations');
    console.log('- Spotify Auth: GET /api/spotify/login');
    console.log('- Search Tracks: GET /api/spotify/search');
    console.log('- Music from Text: POST /api/music/recommendations-from-text');
    console.log('- Music from Mood: POST /api/music/recommendations-from-mood');
    
    // Update .env file with new port if it's different from the default
    if (port !== DEFAULT_PORT) {
      console.log(`\nNote: Using port ${port} instead of default port ${DEFAULT_PORT}`);
      console.log(`If you want to use this port consistently, update the PORT in your .env file.`);
    }
  });
}

// Start server - only in local development, not in Vercel
if (process.env.VERCEL !== '1') {
  startServer(DEFAULT_PORT, MAX_PORT_ATTEMPTS);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

export default app; 