/**
 * Utility functions for prompt engineering and text processing
 */

/**
 * Sanitizes text input to prevent prompt injection and improve analysis quality
 * @param text Raw user input text
 * @returns Cleaned text safe for AI processing
 */
export function sanitizeTextInput(text: string): string {
  if (!text) return '';
  
  // Trim whitespace
  let sanitized = text.trim();
  
  // Normalize quotes
  sanitized = sanitized.replace(/[""]/g, '"').replace(/['']/g, "'");
  
  // Remove markdown/formatting attempts
  sanitized = sanitized.replace(/```[\s\S]*?```/g, ''); // Remove code blocks
  sanitized = sanitized.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove bold formatting
  sanitized = sanitized.replace(/\*(.*?)\*/g, '$1'); // Remove italic formatting
  
  // Remove URL patterns to prevent phishing attempts
  sanitized = sanitized.replace(/https?:\/\/\S+/g, '[URL REMOVED]');
  
  // Limit length
  const MAX_LENGTH = 1000;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH) + '...';
  }
  
  return sanitized;
}

/**
 * Extracts emotional content hints from text to improve mood analysis
 * @param text Input text to analyze
 * @returns Array of emotional keywords found in the text
 */
export function extractEmotionalHints(text: string): string[] {
  const lowercaseText = text.toLowerCase();
  const hints: string[] = [];
  
  // Lists of emotional keywords to check for
  const positiveEmotions = [
    'happy', 'excited', 'joyful', 'elated', 'pleased', 'glad', 'delighted', 
    'content', 'satisfied', 'cheerful', 'optimistic', 'hopeful', 'proud', 
    'grateful', 'loving', 'peaceful'
  ];
  
  const negativeEmotions = [
    'sad', 'angry', 'anxious', 'depressed', 'stressed', 'worried', 'frustrated',
    'disappointed', 'upset', 'miserable', 'irritated', 'annoyed', 'hurt',
    'jealous', 'guilty', 'ashamed', 'lonely', 'bored', 'tired', 'exhausted',
    'melancholy', 'nostalgic', 'regretful'
  ];
  
  const energyLevels = [
    'energetic', 'calm', 'relaxed', 'lazy', 'exhausted', 'hyper', 'motivated',
    'lethargic', 'active', 'passive', 'alert', 'sleepy', 'tired', 'restless',
    'tranquil', 'serene'
  ];
  
  const complexEmotions = [
    'nostalgic', 'melancholic', 'bittersweet', 'ambivalent', 'overwhelmed',
    'inspired', 'awed', 'curious', 'confused', 'surprised', 'shocked',
    'vulnerable', 'empowered', 'reflective', 'contemplative', 'determined',
    'passionate', 'indifferent', 'apathetic', 'grateful', 'appreciative',
    'yearning', 'longing'
  ];
  
  // Check for each emotion keyword in the text
  const allEmotions = [...positiveEmotions, ...negativeEmotions, ...energyLevels, ...complexEmotions];
  
  for (const emotion of allEmotions) {
    // Check for the word with word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${emotion}\\b`, 'i');
    if (regex.test(lowercaseText)) {
      hints.push(emotion);
    }
  }
  
  // Check for intensifiers that might modify emotions
  const intensifiers = ['very', 'extremely', 'incredibly', 'so', 'really', 'quite'];
  for (const intensifier of intensifiers) {
    const regex = new RegExp(`\\b${intensifier}\\s+(\\w+)\\b`, 'gi');
    let match;
    while ((match = regex.exec(lowercaseText)) !== null) {
      const potentialEmotion = match[1].toLowerCase();
      if (allEmotions.includes(potentialEmotion) && !hints.includes(potentialEmotion)) {
        hints.push(`${intensifier} ${potentialEmotion}`);
      }
    }
  }
  
  return hints;
}

/**
 * Formats text for analysis by sanitizing and extracting emotional hints
 * @param text Raw user input text
 * @returns Cleaned text for better analysis
 */
export function formatTextForAnalysis(text: string): string {
  return sanitizeTextInput(text);
}