import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import * as spotifyService from '../services/spotifyService';

const router = express.Router();

// Store state for CSRF protection (in memory for development)
// In production, use Redis or another persistent store
const pendingStates: Record<string, { createdAt: number }> = {};

// Clean up expired states every hour
setInterval(() => {
  const now = Date.now();
  Object.keys(pendingStates).forEach(state => {
    if (now - pendingStates[state].createdAt > 24 * 60 * 60 * 1000) { // 24 hours
      delete pendingStates[state];
    }
  });
}, 60 * 60 * 1000);

/**
 * @route   GET /api/spotify/login
 * @desc    Start Spotify OAuth flow
 * @access  Public
 */
router.get('/login', (req: Request, res: Response) => {
  try {
    // Generate a random state for CSRF protection
    const state = crypto.randomBytes(20).toString('hex');
    
    // Store state to verify on callback
    pendingStates[state] = { createdAt: Date.now() };
    
    // Redirect to Spotify authorization page
    const authUrl = spotifyService.getAuthorizationUrl(state);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating Spotify login:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

/**
 * @route   GET /api/spotify/callback
 * @desc    Handle Spotify OAuth callback
 * @access  Public
 */
router.get('/callback', (req: Request, res: Response) => {
  (async () => {
    try {
      const { code, state, error } = req.query;
      
      // Check if there was an error or if state is missing
      if (error) {
        return res.status(400).json({ success: false, error: `Spotify authorization error: ${error}` });
      }
      
      if (!state || !pendingStates[state as string]) {
        return res.status(400).json({ success: false, error: 'Invalid state parameter' });
      }
      
      // Delete the used state
      delete pendingStates[state as string];
      
      if (!code) {
        return res.status(400).json({ success: false, error: 'Authorization code missing' });
      }
      
      // Exchange code for tokens
      const tokenInfo = await spotifyService.exchangeCodeForTokens(code as string);
      
      // In a real application, you might store the user ID in a session or JWT
      // and redirect to your frontend application
      res.status(200).json({
        success: true,
        userId: tokenInfo.userId,
        message: 'Authentication successful'
      });
    } catch (error) {
      console.error('Error handling Spotify callback:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  })();
});

/**
 * @route   GET /api/spotify/search
 * @desc    Search for tracks on Spotify
 * @access  Private
 */
router.get('/search', (req: Request, res: Response) => {
  (async () => {
    try {
      const { userId, query, limit } = req.query;
      
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
      }
      
      if (!query) {
        return res.status(400).json({ success: false, error: 'Search query is required' });
      }
      
      const tracks = await spotifyService.searchTracks(
        userId as string,
        query as string,
        limit ? parseInt(limit as string, 10) : undefined
      );
      
      res.status(200).json({
        success: true,
        tracks
      });
    } catch (error) {
      console.error('Error searching Spotify tracks:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  })();
});

/**
 * @route   POST /api/spotify/recommendations
 * @desc    Get track recommendations based on seeds and audio features
 * @access  Private
 */
router.post('/recommendations', (req: Request, res: Response) => {
  (async () => {
    try {
      const { userId, seed_tracks, seed_artists, seed_genres, 
        target_energy, target_valence, target_danceability,
        target_acousticness, target_instrumentalness, target_tempo,
        limit } = req.body;
      
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
      }
      
      // Need at least one seed type
      if ((!seed_tracks || seed_tracks.length === 0) && 
          (!seed_artists || seed_artists.length === 0) && 
          (!seed_genres || seed_genres.length === 0)) {
        return res.status(400).json({ 
          success: false, 
          error: 'At least one seed track, artist, or genre is required' 
        });
      }
      
      const recommendations = await spotifyService.getRecommendations(userId, {
        seed_tracks,
        seed_artists,
        seed_genres,
        target_energy,
        target_valence,
        target_danceability,
        target_acousticness,
        target_instrumentalness,
        target_tempo,
        limit
      });
      
      res.status(200).json({
        success: true,
        recommendations
      });
    } catch (error) {
      console.error('Error getting Spotify recommendations:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  })();
});

/**
 * @route   POST /api/spotify/playlists
 * @desc    Create a new playlist
 * @access  Private
 */
router.post('/playlists', (req: Request, res: Response) => {
  (async () => {
    try {
      const { userId, name, description, isPublic } = req.body;
      
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
      }
      
      if (!name) {
        return res.status(400).json({ success: false, error: 'Playlist name is required' });
      }
      
      const playlist = await spotifyService.createPlaylist(
        userId,
        name,
        description || '',
        isPublic
      );
      
      res.status(201).json({
        success: true,
        playlist
      });
    } catch (error) {
      console.error('Error creating Spotify playlist:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  })();
});

/**
 * @route   POST /api/spotify/playlists/:playlistId/tracks
 * @desc    Add tracks to a playlist
 * @access  Private
 */
router.post('/playlists/:playlistId/tracks', (req: Request, res: Response) => {
  (async () => {
    try {
      const { playlistId } = req.params;
      const { userId, trackUris } = req.body;
      
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
      }
      
      if (!trackUris || !Array.isArray(trackUris) || trackUris.length === 0) {
        return res.status(400).json({ success: false, error: 'Track URIs are required' });
      }
      
      const result = await spotifyService.addTracksToPlaylist(userId, playlistId, trackUris);
      
      res.status(201).json({
        success: true,
        result
      });
    } catch (error) {
      console.error('Error adding tracks to playlist:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  })();
});

/**
 * @route   POST /api/spotify/mood-playlist
 * @desc    Generate a playlist based on mood analysis
 * @access  Private
 */
router.post('/mood-playlist', (req: Request, res: Response) => {
  (async () => {
    try {
      const { 
        userId, 
        mood, energy, valence, danceability, genres,
        playlistName, playlistDescription, trackCount
      } = req.body;
      
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
      }
      
      if (!mood || energy === undefined || valence === undefined || danceability === undefined) {
        return res.status(400).json({ 
          success: false, 
          error: 'Mood, energy, valence, and danceability are required' 
        });
      }
      
      const result = await spotifyService.generateMoodPlaylist(
        userId,
        {
          mood,
          energy,
          valence,
          danceability,
          genres: genres || []
        },
        {
          name: playlistName,
          description: playlistDescription,
          trackCount: trackCount
        }
      );
      
      res.status(201).json({
        success: true,
        playlist: result.playlist,
        tracks: result.tracks
      });
    } catch (error) {
      console.error('Error generating mood playlist:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  })();
});

/**
 * @route   POST /api/spotify/mood-recommendations
 * @desc    Get track recommendations based on mood analysis without creating a playlist
 * @access  Private
 */
router.post('/mood-recommendations', (req: Request, res: Response) => {
  (async () => {
    try {
      const { 
        userId, 
        mood, energy, valence, danceability, genres,
        limit
      } = req.body;
      
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
      }
      
      if (!mood || energy === undefined || valence === undefined || danceability === undefined) {
        return res.status(400).json({ 
          success: false, 
          error: 'Mood, energy, valence, and danceability are required' 
        });
      }
      
      const tracks = await spotifyService.getRecommendations(
        userId,
        {
          seed_genres: genres || [],
          target_energy: energy,
          target_valence: valence,
          target_danceability: danceability,
          limit: limit || 20
        }
      );
      
      res.status(200).json({
        success: true,
        tracks,
        moodParams: {
          mood,
          energy,
          valence,
          danceability,
          genres: genres || []
        }
      });
    } catch (error) {
      console.error('Error getting mood recommendations:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  })();
});

export { router as spotifyRoutes };
export default router; 