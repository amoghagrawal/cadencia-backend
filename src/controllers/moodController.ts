import { Request, Response } from 'express';
import { analyzeMood } from '../services/groqService';
import { getRecommendations } from '../services/musicRecommendationService';
import { formatTextForAnalysis, sanitizeTextInput } from '../utils/promptUtils';

/**
 * Analyzes the mood from text input
 * @param text User input text to analyze for mood
 * @returns Mood analysis with parameters for music recommendations
 */
export async function analyzeText(text: string): Promise<any> {
  try {
    console.log(`Processing mood analysis request for text (${text.length} characters)`);
    
    // Sanitize and format the text for analysis
    const formattedText = formatTextForAnalysis(text);
    
    // Log the text before and after processing for debugging
    console.log(`Text before processing: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    console.log(`Text after processing: "${formattedText.substring(0, 50)}${formattedText.length > 50 ? '...' : ''}"`);
    
    // Get mood analysis from GroqAPI
    console.time('mood-analysis');
    const moodAnalysis = await analyzeMood({ text: formattedText });
    console.timeEnd('mood-analysis');
    
    return moodAnalysis;
  } catch (error) {
    console.error('Error in mood analysis:', error);
    throw error;
  }
}

/**
 * Gets music recommendations based on text input
 * @param text User input text to analyze
 * @param includeGenres Optional array of genres to include in recommendations
 * @param excludeGenres Optional array of genres to exclude from recommendations
 * @returns Mood analysis and music recommendations
 */
export async function getMusicRecommendationsFromText(
  text: string,
  includeGenres?: string[],
  excludeGenres?: string[]
): Promise<any> {
  try {
    console.log(`Processing music recommendation request`);
    console.log(`Include genres: ${includeGenres ? includeGenres.join(', ') : 'none'}`);
    console.log(`Exclude genres: ${excludeGenres ? excludeGenres.join(', ') : 'none'}`);
    
    // First analyze the mood from the text
    console.time('full-recommendation-flow');
    
    // Step 1: Get mood analysis
    console.time('mood-analysis-step');
    const moodAnalysis = await analyzeText(text);
    console.timeEnd('mood-analysis-step');
    
    // Step 2: Get music recommendations
    console.time('recommendation-generation');
    const recommendations = await getRecommendations({
      mood: moodAnalysis.mood,
      energy: moodAnalysis.energy,
      valence: moodAnalysis.valence,
      danceability: moodAnalysis.danceability,
      genres: moodAnalysis.genres,
      includeGenres: includeGenres || [],
      excludeGenres: excludeGenres || []
    });
    console.timeEnd('recommendation-generation');
    
    console.timeEnd('full-recommendation-flow');
    
    // Return both the mood analysis and recommendations
    return {
      moodAnalysis,
      recommendations
    };
  } catch (error) {
    console.error('Error in music recommendations:', error);
    
    // Provide more detailed error information
    if (error instanceof Error) {
      throw new Error(`Music recommendation error: ${error.message}`);
    }
    throw error;
  }
}

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
 * Analyze text and return mood analysis
 */
export const analyzeTextFromRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'Valid text input is required' });
      return;
    }
    
    // Analyze mood using GroqAPI
    const moodAnalysis = await analyzeText(text);
    
    res.status(200).json(moodAnalysis);
  } catch (error) {
    console.error('Error analyzing mood:', error);
    res.status(500).json({ 
      error: 'Failed to analyze mood', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

/**
 * Get music recommendations based on text input
 */
export const getMusicRecommendationsFromTextRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, includeGenres, excludeGenres } = req.body;
    
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'Valid text input is required' });
      return;
    }
    
    // Analyze mood using GroqAPI
    const moodAnalysis = await analyzeText(text);
    
    // Get music recommendations based on mood analysis
    const recommendations = await getMusicRecommendationsFromText(
      text,
      includeGenres,
      excludeGenres
    );
    
    res.status(200).json({
      moodAnalysis,
      recommendations
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ 
      error: 'Failed to get music recommendations', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}; 