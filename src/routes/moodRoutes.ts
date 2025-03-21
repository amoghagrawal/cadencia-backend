import express from 'express';
import type { Request, Response } from 'express';
import { analyzeText, getMusicRecommendationsFromText } from '../controllers/moodController';

const router = express.Router();

/**
 * Validate user text input
 * @param text Input text to validate
 * @returns Object with validation result and optional error message
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
 * @route   POST /api/mood/analyze
 * @desc    Analyze text and extract mood parameters
 * @access  Public
 */
router.post('/analyze', (req: Request, res: Response) => {
  (async () => {
    try {
      const { text } = req.body;
      
      // Validate the text input
      const validation = validateTextInput(text);
      if (!validation.isValid) {
        return res.status(400).json({ 
          success: false, 
          error: validation.errorMessage 
        });
      }

      // Process the analysis request
      console.log(`[${new Date().toISOString()}] Mood analysis request received`);
      const startTime = Date.now();
      const moodAnalysis = await analyzeText(text);
      const processingTime = Date.now() - startTime;
      
      console.log(`[${new Date().toISOString()}] Mood analysis completed in ${processingTime}ms`);
      
      res.status(200).json(moodAnalysis);
    } catch (error) {
      console.error('Error in mood analysis:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        timestamp: new Date().toISOString()
      });
    }
  })();
});

/**
 * @route   POST /api/mood/recommendations
 * @desc    Get music recommendations based on text
 * @access  Public
 */
router.post('/recommendations', (req: Request, res: Response) => {
  (async () => {
    try {
      const { text, includeGenres, excludeGenres } = req.body;
      
      // Validate the text input
      const validation = validateTextInput(text);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false, 
          error: validation.errorMessage
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

      // Process the recommendation request
      console.log(`[${new Date().toISOString()}] Music recommendation request received`);
      const startTime = Date.now();
      const recommendations = await getMusicRecommendationsFromText(
        text, 
        includeGenres, 
        excludeGenres
      );
      const processingTime = Date.now() - startTime;
      
      console.log(`[${new Date().toISOString()}] Music recommendation completed in ${processingTime}ms`);
      
      res.status(200).json(recommendations);
    } catch (error) {
      console.error('Error in music recommendations:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        timestamp: new Date().toISOString()
      });
    }
  })();
});

export { router as moodRoutes }; 