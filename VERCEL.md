# Vercel Deployment Guide

## Environment Variables Setup

When deploying your Cadencia backend to Vercel, you need to set up the following environment variables in the Vercel dashboard:

### Required Variables

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `GROQ_API_KEY` | your_api_key_here | Your Groq API key |
| `GROQ_MODEL` | `llama3-8b-8192` | The correct Groq model name |
| `GROQ_API_URL` | `https://api.groq.com/openai/v1` | Groq API endpoint |
| `NODE_ENV` | `production` | Environment setting |

### Optional Variables (for Spotify Integration)

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `SPOTIFY_CLIENT_ID` | your_spotify_client_id | From Spotify Developer Dashboard |
| `SPOTIFY_CLIENT_SECRET` | your_spotify_client_secret | From Spotify Developer Dashboard |
| `SPOTIFY_REDIRECT_URI` | `https://your-vercel-domain.vercel.app/api/spotify/callback` | Update with your domain |

## Setting Environment Variables on Vercel

1. Go to your Vercel dashboard
2. Select your Cadencia project
3. Click on "Settings" tab
4. Navigate to "Environment Variables" section
5. Add each variable individually
6. After adding all variables, redeploy your project

## Troubleshooting

If you encounter model-related errors, ensure:

- The model name is exactly `llama3-8b-8192` (without hyphens between llama and 3)
- Your Groq API key has access to this model
- The API URL is correctly specified

For other deployment issues, check the Vercel logs for detailed error messages. 