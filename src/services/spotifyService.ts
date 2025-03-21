import axios from 'axios';
import querystring from 'querystring';

// Spotify API configuration
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';
const SPOTIFY_ACCOUNTS_URL = 'https://accounts.spotify.com/api/token';
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || `${BASE_URL}/api/spotify/callback`;

// Token storage (in-memory for development)
// In production, use a proper database or Redis
interface TokenInfo {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
}

const tokenStorage: Record<string, TokenInfo> = {};

/**
 * Generate the authorization URL for Spotify OAuth
 */
export function getAuthorizationUrl(state: string): string {
  const scope = [
    'user-read-private',
    'user-read-email',
    'user-library-read',
    'playlist-read-private',
    'playlist-modify-private',
    'playlist-modify-public',
    'user-top-read',
    'user-read-recently-played',
    'streaming'
  ].join(' ');

  const params = {
    response_type: 'code',
    client_id: CLIENT_ID,
    scope,
    redirect_uri: REDIRECT_URI,
    state
  };

  return `https://accounts.spotify.com/authorize?${querystring.stringify(params)}`;
}

/**
 * Exchange authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<TokenInfo> {
  try {
    const response = await axios.post(
      SPOTIFY_ACCOUNTS_URL,
      querystring.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
        }
      }
    );

    // Get user profile to identify the user
    const userProfile = await getUserProfile(response.data.access_token);
    
    const tokenInfo: TokenInfo = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: Date.now() + (response.data.expires_in * 1000),
      userId: userProfile.id
    };

    // Store token information
    tokenStorage[userProfile.id] = tokenInfo;
    return tokenInfo;
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw new Error('Failed to authenticate with Spotify');
  }
}

/**
 * Refresh access token when it expires
 */
export async function refreshAccessToken(userId: string): Promise<string> {
  try {
    const tokenInfo = tokenStorage[userId];
    if (!tokenInfo) {
      throw new Error('User not authenticated');
    }

    const response = await axios.post(
      SPOTIFY_ACCOUNTS_URL,
      querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: tokenInfo.refreshToken
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
        }
      }
    );

    // Update token information
    tokenInfo.accessToken = response.data.access_token;
    tokenInfo.expiresAt = Date.now() + (response.data.expires_in * 1000);
    
    // Store updated token
    tokenStorage[userId] = tokenInfo;
    
    return tokenInfo.accessToken;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw new Error('Failed to refresh access token');
  }
}

/**
 * Get user's Spotify profile
 */
export async function getUserProfile(accessToken: string): Promise<any> {
  try {
    const response = await axios.get(`${SPOTIFY_API_URL}/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw new Error('Failed to get user profile');
  }
}

/**
 * Get or refresh access token for a user
 */
async function getValidAccessToken(userId: string): Promise<string> {
  const tokenInfo = tokenStorage[userId];
  if (!tokenInfo) {
    throw new Error('User not authenticated');
  }

  // Check if token is expired or about to expire (within 5 minutes)
  if (tokenInfo.expiresAt < Date.now() + (5 * 60 * 1000)) {
    return await refreshAccessToken(userId);
  }

  return tokenInfo.accessToken;
}

/**
 * Search for tracks based on query
 */
export async function searchTracks(userId: string, query: string, limit = 20): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(userId);
    
    const response = await axios.get(`${SPOTIFY_API_URL}/search`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      params: {
        q: query,
        type: 'track',
        limit
      }
    });
    
    return response.data.tracks.items;
  } catch (error) {
    console.error('Error searching tracks:', error);
    throw new Error('Failed to search tracks');
  }
}

/**
 * Get recommendations based on seed tracks, artists, genres, and audio features
 */
export async function getRecommendations(
  userId: string, 
  params: {
    seed_tracks?: string[];
    seed_artists?: string[];
    seed_genres?: string[];
    target_energy?: number;
    target_valence?: number;
    target_danceability?: number;
    target_acousticness?: number;
    target_instrumentalness?: number;
    target_tempo?: number;
    limit?: number;
  }
): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(userId);
    
    // Format seed parameters
    const seedParams: Record<string, string> = {};
    if (params.seed_tracks && params.seed_tracks.length > 0) {
      seedParams.seed_tracks = params.seed_tracks.slice(0, 5).join(',');
    }
    if (params.seed_artists && params.seed_artists.length > 0) {
      seedParams.seed_artists = params.seed_artists.slice(0, 5).join(',');
    }
    if (params.seed_genres && params.seed_genres.length > 0) {
      seedParams.seed_genres = params.seed_genres.slice(0, 5).join(',');
    }
    
    // Prepare request parameters
    const requestParams = {
      ...seedParams,
      limit: params.limit || 20,
      // Add audio features if provided
      ...(params.target_energy !== undefined && { target_energy: params.target_energy }),
      ...(params.target_valence !== undefined && { target_valence: params.target_valence }),
      ...(params.target_danceability !== undefined && { target_danceability: params.target_danceability }),
      ...(params.target_acousticness !== undefined && { target_acousticness: params.target_acousticness }),
      ...(params.target_instrumentalness !== undefined && { target_instrumentalness: params.target_instrumentalness }),
      ...(params.target_tempo !== undefined && { target_tempo: params.target_tempo })
    };
    
    const response = await axios.get(`${SPOTIFY_API_URL}/recommendations`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      params: requestParams
    });
    
    return response.data.tracks;
  } catch (error) {
    console.error('Error getting recommendations:', error);
    throw new Error('Failed to get recommendations');
  }
}

/**
 * Create a playlist for a user
 */
export async function createPlaylist(
  userId: string, 
  name: string, 
  description: string, 
  isPublic = false
): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(userId);
    
    const response = await axios.post(
      `${SPOTIFY_API_URL}/users/${userId}/playlists`,
      {
        name,
        description,
        public: isPublic
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error creating playlist:', error);
    throw new Error('Failed to create playlist');
  }
}

/**
 * Add tracks to a playlist
 */
export async function addTracksToPlaylist(
  userId: string, 
  playlistId: string, 
  trackUris: string[]
): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(userId);
    
    const response = await axios.post(
      `${SPOTIFY_API_URL}/playlists/${playlistId}/tracks`,
      {
        uris: trackUris
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error adding tracks to playlist:', error);
    throw new Error('Failed to add tracks to playlist');
  }
}

/**
 * Generate playlist based on mood analysis
 */
export async function generateMoodPlaylist(
  userId: string,
  moodParams: {
    mood: string;
    energy: number;
    valence: number;
    danceability: number;
    genres: string[];
  },
  playlistOptions: {
    name?: string;
    description?: string;
    trackCount?: number;
  } = {}
): Promise<any> {
  try {
    // Set default playlist options
    const options = {
      name: playlistOptions.name || `${moodParams.mood} Mood`,
      description: playlistOptions.description || `Playlist generated based on ${moodParams.mood} mood by Cadencia`,
      trackCount: playlistOptions.trackCount || 20
    };
    
    // Get recommendations based on mood
    const recommendations = await getRecommendations(userId, {
      seed_genres: moodParams.genres.slice(0, 5),
      target_energy: moodParams.energy,
      target_valence: moodParams.valence,
      target_danceability: moodParams.danceability,
      limit: options.trackCount
    });
    
    // Create a new playlist
    const playlist = await createPlaylist(userId, options.name, options.description);
    
    // Add tracks to the playlist
    if (recommendations.length > 0) {
      const trackUris = recommendations.map((track: any) => track.uri);
      await addTracksToPlaylist(userId, playlist.id, trackUris);
    }
    
    return {
      playlist,
      tracks: recommendations
    };
  } catch (error) {
    console.error('Error generating mood playlist:', error);
    throw new Error('Failed to generate mood playlist');
  }
} 