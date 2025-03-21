import express from 'express';
import type { Request, Response } from 'express';
import { getMusicRecommendationsFromText, getMusicRecommendationsFromMood } from '../controllers/musicController';

const router = express.Router();

/**
 * Validate user text input
 */
function validateTextInput(text: any): { isValid: boolean; errorMessage?: string } {
  if (!text) {
    return { isValid: false, errorMessage: 'Text input is required' };
  }
  
  if (typeof text !== 'string') {
    return { isValid: false, errorMessage: 'Text input must be a string' };
  }
  
  if (text.trim().length === 0) {
    return { isValid: false, errorMessage: 'Text input cannot be empty' };
  }
  
  if (text.length > 5000) {
    return { isValid: false, errorMessage: 'Text input exceeds maximum length of 5000 characters' };
  }
  
  return { isValid: true };
}

/**
 * @route   POST /api/music/recommendations-from-text
 * @desc    Get music recommendations based on text analysis
 * @access  Private
 */
router.post('/recommendations-from-text', (req: Request, res: Response) => {
  (async () => {
    try {
      const { 
        text, userId, includeGenres, excludeGenres, 
        generatePlaylist, playlistName, playlistDescription, trackCount 
      } = req.body;
      
      // Validate text input
      const validation = validateTextInput(text);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: validation.errorMessage
        });
      }
      
      // Validate userId
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required for Spotify authentication'
        });
      }
      
      // Validate genre arrays
      if (includeGenres && !Array.isArray(includeGenres)) {
        return res.status(400).json({
          success: false,
          error: 'includeGenres must be an array of strings'
        });
      }
      
      if (excludeGenres && !Array.isArray(excludeGenres)) {
        return res.status(400).json({
          success: false,
          error: 'excludeGenres must be an array of strings'
        });
      }
      
      console.log(`Music recommendation request received for user ${userId}`);
      console.time('full-recommendation-flow');
      
      const result = await getMusicRecommendationsFromText({
        text,
        userId,
        includeGenres,
        excludeGenres,
        generatePlaylist,
        playlistName,
        playlistDescription,
        trackCount
      });
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in music recommendations from text:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        timestamp: new Date().toISOString()
      });
    }
  })();
});

/**
 * @route   POST /api/music/recommendations-from-mood
 * @desc    Get music recommendations based on mood parameters
 * @access  Private
 */
router.post('/recommendations-from-mood', (req: Request, res: Response) => {
  (async () => {
    try {
      const { 
        userId, mood, energy, valence, danceability, genres,
        generatePlaylist, playlistName, playlistDescription, trackCount 
      } = req.body;
      
      // Validate userId
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required for Spotify authentication'
        });
      }
      
      // Validate mood parameters
      if (!mood || energy === undefined || valence === undefined || danceability === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Mood, energy, valence, and danceability are required'
        });
      }
      
      // Validate numerical values
      if (typeof energy !== 'number' || energy < 0 || energy > 1) {
        return res.status(400).json({
          success: false,
          error: 'Energy must be a number between 0 and 1'
        });
      }
      
      if (typeof valence !== 'number' || valence < 0 || valence > 1) {
        return res.status(400).json({
          success: false,
          error: 'Valence must be a number between 0 and 1'
        });
      }
      
      if (typeof danceability !== 'number' || danceability < 0 || danceability > 1) {
        return res.status(400).json({
          success: false,
          error: 'Danceability must be a number between 0 and 1'
        });
      }
      
      // Validate genre array
      if (genres && !Array.isArray(genres)) {
        return res.status(400).json({
          success: false,
          error: 'Genres must be an array of strings'
        });
      }
      
      console.log(`Music recommendation request from mood received for user ${userId}`);
      
      const result = await getMusicRecommendationsFromMood(
        userId,
        {
          mood,
          energy,
          valence,
          danceability,
          genres
        },
        {
          generatePlaylist,
          playlistName,
          playlistDescription,
          trackCount
        }
      );
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in music recommendations from mood:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        timestamp: new Date().toISOString()
      });
    }
  })();
});

export { router as musicRoutes }; 