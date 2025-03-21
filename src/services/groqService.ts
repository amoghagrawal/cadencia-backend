import Groq from 'groq-sdk';
import { extractEmotionalHints, sanitizeTextInput } from '../utils/promptUtils';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY as string
});

// Model to use for analysis
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const API_URL = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1';
const MODEL = process.env.GROQ_MODEL || 'llama3-8b-8192';

// Mood analysis parameters interface
export interface MoodAnalysisParams {
  text: string;
}

// Mood analysis response interface
export interface MoodAnalysisResponse {
  mood: string;
  energy: number;      // 0-1 scale
  danceability: number; // 0-1 scale
  valence: number;     // 0-1 scale (negativity-positivity)
  genres: string[];
  descriptors: string[];
  explanation?: string;
}

/**
 * Analyze mood from text using GroqAPI
 * @param params Object containing text to analyze
 * @returns Mood analysis parameters for music recommendations
 */
export async function analyzeMood(params: MoodAnalysisParams): Promise<MoodAnalysisResponse> {
  try {
    const { text } = params;
    
    // Sanitize the input text to prevent prompt injection
    const cleanText = sanitizeTextInput(text);
    
    // Extract emotional hints from the text
    const emotionalHints = extractEmotionalHints(cleanText);
    
    // Build the prompt for mood analysis
    const prompt = buildMoodAnalysisPrompt(cleanText, emotionalHints);
    
    // Log the request for debugging purposes
    console.log(`Sending request to GroqAPI with prompt length: ${prompt.length} characters`);
    
    // Call the API
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are a specialized AI assistant that analyzes emotional content in text and converts it into music parameters. You have expertise in psychology, music theory, and emotional analysis. Your goal is to provide accurate parameters that can be used to select music matching the emotional state expressed in the text. Always respond with valid JSON that follows the requested format exactly."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 800,
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const responseContent = response.choices[0]?.message?.content || '';
    
    // Log token usage for monitoring purposes
    console.log(`Token usage: ${response.usage?.total_tokens || 'unknown'} total tokens`);
    
    try {
      const parsedResponse = JSON.parse(responseContent);
      
      // Ensure all parameters are within range (0-1)
      const normalizedResponse: MoodAnalysisResponse = {
        mood: parsedResponse.mood || 'neutral',
        energy: normalizeBetweenZeroAndOne(parsedResponse.energy),
        valence: normalizeBetweenZeroAndOne(parsedResponse.valence),
        danceability: normalizeBetweenZeroAndOne(parsedResponse.danceability),
        genres: Array.isArray(parsedResponse.genres) ? parsedResponse.genres : [],
        descriptors: Array.isArray(parsedResponse.descriptors) ? parsedResponse.descriptors : [],
        explanation: parsedResponse.explanation
      };

      // Log the normalized response for debugging
      console.log(`Mood analysis complete: Primary mood "${normalizedResponse.mood}" with energy ${normalizedResponse.energy.toFixed(2)}`);
      
      return normalizedResponse;
    } catch (parseError) {
      console.error('Error parsing GroqAPI response:', parseError);
      console.error('Raw response:', responseContent);
      throw new Error('Failed to parse mood analysis response');
    }
  } catch (error) {
    console.error('Error in GroqAPI call:', error);
    throw error;
  }
}

/**
 * Build the prompt for mood analysis
 */
function buildMoodAnalysisPrompt(text: string, emotionalHints: string[]): string {
  let prompt = `Analyze the emotional content of this text and convert it to music parameters: "${text}"\n\n`;
  
  if (emotionalHints.length > 0) {
    prompt += `I've identified some potential emotional content in the text: ${emotionalHints.join(', ')}\n\n`;
  }
  
  prompt += `
Based on careful psychological analysis of the text, create a JSON object with the following fields:

- mood: A single primary mood word (e.g., "happy", "melancholic", "nostalgic", "energetic", "reflective")
- energy: A number from 0 to 1 representing the energy level (0 = very calm/low energy, 1 = very energetic/high energy)
- valence: A number from 0 to 1 representing emotional positivity (0 = very negative, 1 = very positive)
- danceability: A number from 0 to 1 representing how suitable for dancing the matching music would be
- genres: An array of 2-5 music genres that match this emotional state (e.g. ["indie pop", "ambient", "electronic", "lo-fi"])
- descriptors: An array of 3-5 adjectives that further describe the emotional quality
- explanation: A brief explanation of your analysis (1-2 sentences)

For energy, valence, and danceability, provide precise decimal values between 0 and 1 (e.g., 0.75).
For genres, select music styles that would typically match the identified mood and energy levels.
For mood analysis, consider both explicit emotional statements and implicit tone.`;

  return prompt;
}

/**
 * Ensure a value is between 0 and 1
 */
function normalizeBetweenZeroAndOne(value: any): number {
  if (typeof value !== 'number') {
    // If not a number, convert to a default value
    return 0.5;
  }
  
  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, value));
} 