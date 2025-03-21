import { MoodAnalysisResponse } from './groqService';

// Define common music genres organized by mood categories
const GENRE_MOOD_MAP = {
  happy: ['pop', 'dance pop', 'happy', 'disco', 'funk', 'tropical house', 'edm'],
  energetic: ['dance', 'electronic', 'house', 'techno', 'dubstep', 'drum-and-bass', 'workout'],
  relaxed: ['chill', 'ambient', 'acoustic', 'lofi', 'jazz', 'piano', 'meditation', 'sleep'],
  sad: ['sad', 'indie', 'melancholic', 'emo', 'slowcore', 'dream pop', 'depressive black metal'],
  angry: ['metal', 'hardcore', 'punk', 'grunge', 'death metal', 'industrial', 'thrash'],
  pensive: ['indie folk', 'alternative', 'shoegaze', 'post-rock', 'singer-songwriter', 'ambient'],
  romantic: ['r-n-b', 'soul', 'love songs', 'bedroom pop', 'slow jazz', 'neo-soul'],
  nostalgic: ['oldies', '80s', '70s', 'retro', 'synthwave', 'classic rock', 'vintage']
};

// Define interfaces for recommendation parameters
export interface MusicRecommendationParams {
  moodAnalysis: MoodAnalysisResponse;
  limit?: number;
  includeGenres?: string[];
  excludeGenres?: string[];
}

// Interface for recommendation response
export interface MusicRecommendationResponse {
  recommendedGenres: string[];
  spotifyParameters: {
    target_energy: number;
    target_valence: number;
    target_danceability: number;
    seed_genres: string[];
    [key: string]: any; // Allow additional parameters
  };
  moodDescription: string;
}

interface RecommendationParams {
  mood: string;
  energy: number;
  valence: number;
  danceability: number;
  genres: string[];
  includeGenres: string[];
  excludeGenres: string[];
}

interface SpotifyParameters {
  energy: number;
  valence: number;
  danceability: number;
  tempo?: number;
  acousticness?: number;
  instrumentalness?: number;
  popularity?: number;
  liveness?: number;
  speechiness?: number;
  genres?: string[];
}

interface RecommendationResponse {
  recommendedGenres: string[];
  moodDescription: string;
  spotifyParameters: SpotifyParameters;
}

/**
 * Generate music recommendations based on mood analysis
 * 
 * This service converts mood analysis into parameters for music service APIs 
 * (e.g., Spotify recommendations API)
 */
export async function getMusicRecommendations(
  params: MusicRecommendationParams
): Promise<MusicRecommendationResponse> {
  const { moodAnalysis, limit = 10, includeGenres = [], excludeGenres = [] } = params;
  
  // Extract parameters from mood analysis
  const { mood, energy, danceability, valence, genres = [], descriptors = [] } = moodAnalysis;
  
  // Select appropriate genres based on mood and user preferences
  const moodGenres = genres
    .filter(genre => !excludeGenres.includes(genre.toLowerCase()))
    .slice(0, 2);
  
  // Combine mood-based genres with explicitly included genres
  // Spotify allows up to 5 seed genres
  const recommendedGenres = [...new Set([
    ...moodGenres,
    ...includeGenres
  ])].slice(0, 5);
  
  // If no genres were selected, add some defaults based on mood
  if (recommendedGenres.length === 0) {
    recommendedGenres.push(...getDefaultGenres(mood, energy));
  }
  
  // Create a mood description using the mood and descriptors
  const moodDescription = createMoodDescription(mood, descriptors);
  
  // Create advanced Spotify parameters based on the mood
  const spotifyParams: {
    target_energy: number;
    target_valence: number;
    target_danceability: number;
    seed_genres: string[];
    target_acousticness?: number;
    target_instrumentalness?: number;
    target_tempo?: number;
    target_popularity?: number;
    target_mode?: number;
  } = {
    target_energy: energy,
    target_valence: valence,
    target_danceability: danceability,
    seed_genres: recommendedGenres
  };
  
  // Add advanced parameters based on mood
  if (mood.toLowerCase().includes('relaxed') || energy < 0.3) {
    spotifyParams.target_acousticness = 0.7;
    spotifyParams.target_instrumentalness = 0.4;
    spotifyParams.target_tempo = 70 + Math.floor(energy * 20);
  }
  
  if (mood.toLowerCase().includes('energetic') || energy > 0.7) {
    spotifyParams.target_tempo = 120 + Math.floor(energy * 40);
    spotifyParams.target_popularity = 70;
  }
  
  if (mood.toLowerCase().includes('happy') || valence > 0.7) {
    spotifyParams.target_mode = 1; // Major key
    spotifyParams.target_popularity = 70;
  }
  
  if (mood.toLowerCase().includes('sad') || valence < 0.3) {
    spotifyParams.target_mode = 0; // Minor key
    spotifyParams.target_tempo = 60 + Math.floor(energy * 30);
  }
  
  return {
    recommendedGenres,
    spotifyParameters: spotifyParams,
    moodDescription
  };
}

/**
 * Get default genres based on mood when no specific genres are available
 */
function getDefaultGenres(mood: string, energy: number): string[] {
  const moodLower = mood.toLowerCase();
  
  // Try to match the mood with our mood categories
  for (const [moodCategory, genreList] of Object.entries(GENRE_MOOD_MAP)) {
    if (moodLower.includes(moodCategory) || moodLower === moodCategory) {
      // Return 3 random genres from the matching category
      return shuffleArray(genreList).slice(0, 3);
    }
  }
  
  // Fallback based on energy level
  if (energy > 0.7) {
    return shuffleArray(GENRE_MOOD_MAP.energetic).slice(0, 3);
  } else if (energy < 0.3) {
    return shuffleArray(GENRE_MOOD_MAP.relaxed).slice(0, 3);
  }
  
  // Default fallback
  return ['pop', 'rock', 'indie', 'alternative'];
}

/**
 * Create a human-readable mood description
 */
function createMoodDescription(mood: string, descriptors: string[] = []): string {
  const uniqueDescriptors = [...new Set([mood, ...descriptors])];
  
  if (uniqueDescriptors.length <= 2) {
    return uniqueDescriptors.join(' and ');
  }
  
  const lastDescriptor = uniqueDescriptors.pop();
  return `${uniqueDescriptors.join(', ')} and ${lastDescriptor}`;
}

/**
 * Get music recommendations based on mood analysis
 * @param params Mood analysis parameters
 * @returns Music recommendations including Spotify parameters
 */
export async function getRecommendations(params: RecommendationParams): Promise<RecommendationResponse> {
  try {
    const { mood, energy, valence, danceability, genres, includeGenres, excludeGenres } = params;
    
    // Filter genres based on user preferences
    let recommendedGenres = [...genres];
    
    // Include user-specified genres
    if (includeGenres.length > 0) {
      for (const genre of includeGenres) {
        if (!recommendedGenres.includes(genre)) {
          recommendedGenres.push(genre);
        }
      }
    }
    
    // Exclude user-specified genres
    if (excludeGenres.length > 0) {
      recommendedGenres = recommendedGenres.filter(genre => !excludeGenres.includes(genre));
    }
    
    // Ensure we have at least some genres
    if (recommendedGenres.length === 0) {
      recommendedGenres = getDefaultGenres(mood, energy);
    }
    
    // Limit to top 5 genres
    recommendedGenres = recommendedGenres.slice(0, 5);
    
    // Generate mood description
    const moodDescription = generateMoodDescription(mood, energy, valence);
    
    // Create Spotify API parameters
    const spotifyParameters: SpotifyParameters = {
      energy: energy,
      valence: valence,
      danceability: danceability
    };
    
    // Add recommended genres
    if (recommendedGenres.length > 0) {
      spotifyParameters.genres = recommendedGenres;
    }
    
    // Enhance parameters based on the mood and energy level
    enhanceSpotifyParameters(spotifyParameters, mood, energy, valence);
    
    return {
      recommendedGenres,
      moodDescription,
      spotifyParameters
    };
  } catch (error) {
    console.error('Error generating music recommendations:', error);
    throw error;
  }
}

/**
 * Enhance Spotify parameters with additional settings based on mood
 */
function enhanceSpotifyParameters(
  params: SpotifyParameters, 
  mood: string, 
  energy: number, 
  valence: number
): void {
  const moodLower = mood.toLowerCase();
  
  // Parameters for relaxed or calm moods
  if (moodLower.includes('relaxed') || moodLower.includes('calm') || energy < 0.4) {
    params.acousticness = 0.6 + (1 - energy) * 0.3;
    params.instrumentalness = 0.3 + (1 - energy) * 0.4;
    params.tempo = 70 + Math.floor(energy * 25);
  }
  
  // Parameters for energetic moods
  if (moodLower.includes('energetic') || moodLower.includes('excited') || energy > 0.7) {
    params.tempo = 120 + Math.floor(energy * 40); // 120-160 BPM
    params.liveness = 0.3 + energy * 0.3; // Higher liveness for energy
    params.speechiness = Math.min(0.1 + energy * 0.1, 0.2); // Slightly higher speechiness
  }
  
  // Parameters for happy moods
  if (moodLower.includes('happy') || moodLower.includes('joyful') || valence > 0.7) {
    params.popularity = 60 + Math.floor(valence * 25); // More popular tracks for happy moods
  }
  
  // Parameters for sad or melancholic moods
  if (moodLower.includes('sad') || moodLower.includes('melancholic') || valence < 0.3) {
    params.acousticness = 0.4 + (1 - valence) * 0.3;
    params.tempo = 60 + Math.floor(energy * 30); // Slower tempo for sad moods
  }
  
  // Parameters for focused or concentrated moods
  if (moodLower.includes('focus') || moodLower.includes('concentrate') || moodLower.includes('study')) {
    params.instrumentalness = 0.7;
    params.speechiness = 0.05; // Low speechiness for focus
    params.valence = 0.5; // Neutral valence
  }
}

/**
 * Generate a description of the mood for user feedback
 */
function generateMoodDescription(mood: string, energy: number, valence: number): string {
  let description = `Music that matches your ${mood.toLowerCase()} mood`;
  
  if (energy > 0.7) {
    description += ' with high energy';
  } else if (energy < 0.3) {
    description += ' with a calm, relaxed vibe';
  }
  
  if (valence > 0.7) {
    description += ' and a very positive feel';
  } else if (valence < 0.3) {
    description += ' and a more melancholic atmosphere';
  }
  
  return description;
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
} 