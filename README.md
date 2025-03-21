# Cadencia Backend Service

This is the backend service for the Cadencia music recommendation app, providing mood analysis and music recommendations based on user text input.

## Features

- **Mood Analysis API**: Analyzes text input to extract emotional content and convert it into music parameters
- **Music Recommendation API**: Generates music recommendations based on mood analysis
- **Groq AI Integration**: Uses Groq's LLM API for advanced natural language processing
- **Interactive Test Client**: Includes a test client for easily trying out the APIs

## Prerequisites

- Node.js 16+ and npm
- A Groq API key (get one from [console.groq.com](https://console.groq.com))

## Installation

1. Clone the repository
2. Navigate to the backend directory:
   ```
   cd cadencia-backend
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Copy the `.env.example` file to `.env` and add your Groq API key:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_API_URL=https://api.groq.com/openai/v1
   GROQ_MODEL=llama3-8b-8192
   PORT=3000
   NODE_ENV=development
   ```

## Running the Service

### Development mode

```
npm run dev
```

This starts the server with nodemon, which will automatically restart when you make changes.

### Production mode

```
npm run build
npm start
```

## Testing with the Test Client

The project includes a simple test client to interact with the API:

```
npm run client
```

The test client allows you to:
1. Check the API health status
2. Analyze text for mood
3. Get music recommendations based on text

## API Endpoints

### Health Check
- `GET /health`
  - Returns the server status and timestamp

### Mood Analysis
- `POST /api/mood/analyze`
  - Body: `{ "text": "Your text here" }`
  - Returns mood analysis parameters including energy, valence, danceability, genres, and descriptors

### Music Recommendations
- `POST /api/mood/recommendations`
  - Body: 
    ```json
    { 
      "text": "Your text here",
      "includeGenres": ["optional", "genres", "to", "include"],
      "excludeGenres": ["optional", "genres", "to", "exclude"]
    }
    ```
  - Returns mood analysis and corresponding music recommendations with Spotify parameters

## Mood Analysis Architecture

The mood analysis pipeline works as follows:

1. Text input is sanitized to prevent prompt injection and improve analysis quality
2. Emotional content hints are extracted from the text
3. A prompt is constructed for the Groq LLM API including the text and emotional hints
4. The Groq API analyzes the text and returns mood parameters
5. These parameters are used to generate music recommendations

## Integration with iOS App

The iOS app can integrate with this backend service by making HTTP requests to the API endpoints. The recommended approach is to:

1. Use the mood analysis endpoint for analyzing user journal entries or text inputs
2. Use the music recommendations endpoint to get Spotify parameters for music playback
3. Handle the parameters in the iOS app to create appropriate music playlists or recommendations

## Development

### Project Structure

```
cadencia-backend/
├── src/
│   ├── config/       # Configuration settings
│   ├── controllers/  # Route handlers
│   ├── routes/       # API routes
│   ├── services/     # Business logic
│   ├── utils/        # Utility functions
│   └── index.ts      # Main application file
├── test-client.js    # Interactive test client
└── .env              # Environment variables
```

### Adding New Features

To add new features:

1. Create appropriate route handlers in the controllers directory
2. Add new routes in the routes directory
3. Implement business logic in the services directory
4. Update the test client if needed

## License

This project is licensed under the MIT License.