import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.warn('VITE_GEMINI_API_KEY is not set. Gemini analysis will not work.');
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }) : null;

export interface CursorData {
  x: number;
  y: number;
  timestamp: number;
}

export interface AnalysisResult {
  tips: string;
  error?: string;
}

export interface QuestionFeedbackResult {
  feedback: string;
  error?: string;
}

/**
 * Converts a base64 data URL to a format suitable for Gemini API
 */
function base64ToGeminiFormat(dataUrl: string): { mimeType: string; data: string } {
  // Remove the data URL prefix (e.g., "data:image/png;base64,")
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URL format');
  }
  
  const mimeType = matches[1];
  const base64Data = matches[2];
  
  return {
    mimeType,
    data: base64Data,
  };
}

/**
 * Analyzes reading behavior data and provides comprehension tips
 */
export async function analyzeReadingBehavior(
  passage: string,
  screenshot: string | null,
  cursorHistory: CursorData[]
): Promise<AnalysisResult> {
  if (!model) {
    return {
      tips: '',
      error: 'Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.',
    };
  }

  if (!passage) {
    return {
      tips: '',
      error: 'Reading passage is required for analysis.',
    };
  }

  if (cursorHistory.length === 0) {
    return {
      tips: '',
      error: 'No cursor tracking data available. Please start tracking your cursor movements.',
    };
  }

  // Prepare tracking data summary
  const trackingDataSummary = {
    totalPoints: cursorHistory.length,
    duration: cursorHistory.length > 0
      ? (cursorHistory[cursorHistory.length - 1].timestamp - cursorHistory[0].timestamp) / 1000
      : 0,
    coordinateRange: cursorHistory.length > 0
      ? {
          minX: Math.min(...cursorHistory.map(d => d.x)),
          maxX: Math.max(...cursorHistory.map(d => d.x)),
          minY: Math.min(...cursorHistory.map(d => d.y)),
          maxY: Math.max(...cursorHistory.map(d => d.y)),
        }
      : null,
  };

  // Prepare JSON data sample (first 50 and last 50 points for context, plus summary)
  const jsonSample = cursorHistory.length > 100
    ? [
        ...cursorHistory.slice(0, 50),
        { note: '... (middle data omitted for brevity) ...' },
        ...cursorHistory.slice(-50),
      ]
    : cursorHistory;

  const prompt = `You are an expert in reading comprehension and learning analytics. Analyze the following data from a student reading session and provide actionable feedback tips.

**TEXT BEING READ:**

${passage}

**VISUAL ATTENTION DATA:**

- A heatmap image showing cursor movement patterns${screenshot ? ' (attached)' : ' (not available)'}
- JSON file containing cursor coordinates (x, y) and timestamps in milliseconds (see below)
- The heatmap intensity (green/bright areas) indicates where the cursor spent more time
- Each JSON entry represents a cursor position at a specific moment

**CURSOR TRACKING DATA SUMMARY:**
- Total cursor points: ${trackingDataSummary.totalPoints}
- Reading duration: ${trackingDataSummary.duration.toFixed(1)} seconds
- Coordinate range: ${trackingDataSummary.coordinateRange ? `X: ${trackingDataSummary.coordinateRange.minX.toFixed(0)}-${trackingDataSummary.coordinateRange.maxX.toFixed(0)}, Y: ${trackingDataSummary.coordinateRange.minY.toFixed(0)}-${trackingDataSummary.coordinateRange.maxY.toFixed(0)}` : 'N/A'}

**JSON DATA (cursor coordinates and timestamps):**
\`\`\`json
${JSON.stringify(jsonSample, null, 2)}
\`\`\`

**YOUR TASK:**

Based on the heatmap, cursor tracking data, and reading passage, provide 4-6 concise actionable feedback tips for the student.

**OUTPUT FORMAT:**

Start with "Actionable Feedback Tips:" followed by the tips. Each tip should:
- Start with "✓" symbol
- Be 1-2 sentences maximum
- Begin with a specific observation from the data
- Follow with a brief, encouraging recommendation
- Be direct and concise - no verbose explanations

Example format:
"Actionable Feedback Tips:

✓ The first paragraph received a lot of attention but the paragraph about 'ancient DNA' was skimmed. The middle paragraphs often include key details about how researchers did their work. Try to spend more time on the second paragraph next time!

✓ You spent extra time at the beginning and end. This suggests you are good at summarizing and paying attention to conclusions, but the middle parts are important as well! Consider spending a little more time on those."

**IMPORTANT:**
- Keep tips SHORT and CONCISE - 1-2 sentences each
- Be specific and data-driven, referencing actual content from the passage
- Focus on improvement, not criticism
- No verbose explanations - get straight to the point
- Prioritize the most impactful insights`;

  try {
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: prompt },
    ];

    // Add screenshot if available
    if (screenshot) {
      try {
        const imageData = base64ToGeminiFormat(screenshot);
        parts.push({
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.data,
          },
        });
      } catch (error) {
        console.warn('Failed to process screenshot for Gemini:', error);
        // Continue without image if processing fails
      }
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text();

    return {
      tips: text,
    };
  } catch (error: any) {
    console.error('Gemini API error:', error);
    
    let errorMessage = 'Failed to analyze reading behavior.';
    if (error.message?.includes('API_KEY')) {
      errorMessage = 'Invalid API key. Please check your VITE_GEMINI_API_KEY.';
    } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded. Please try again in a minute.';
    } else if (error.message) {
      errorMessage = `Error: ${error.message}`;
    }

    return {
      tips: '',
      error: errorMessage,
    };
  }
}

/**
 * Provides personalized feedback for quiz question answers based on reading behavior
 */
export async function getPersonalizedQuestionFeedback(
  passage: string,
  screenshot: string | null,
  cursorHistory: CursorData[],
  question: string,
  selectedAnswer: string,
  correctAnswer: string,
  isCorrect: boolean
): Promise<QuestionFeedbackResult> {
  if (!model) {
    return {
      feedback: isCorrect ? 'Correct! I love you.' : 'Try again! Focus on the passage to find the answer.',
      error: 'Gemini API key is not configured. Using default feedback.',
    };
  }

  if (!passage) {
    return {
      feedback: isCorrect ? 'Correct! I love you.' : 'Try again! Focus on the passage to find the answer.',
      error: 'Reading passage is required for personalized feedback.',
    };
  }

  // Prepare tracking data summary
  const trackingDataSummary = cursorHistory.length > 0 ? {
    totalPoints: cursorHistory.length,
    duration: (cursorHistory[cursorHistory.length - 1].timestamp - cursorHistory[0].timestamp) / 1000,
    coordinateRange: {
      minX: Math.min(...cursorHistory.map(d => d.x)),
      maxX: Math.max(...cursorHistory.map(d => d.x)),
      minY: Math.min(...cursorHistory.map(d => d.y)),
      maxY: Math.max(...cursorHistory.map(d => d.y)),
    }
  } : null;

  // Prepare JSON data sample (first 30 and last 30 points for context)
  const jsonSample = cursorHistory.length > 60
    ? [
        ...cursorHistory.slice(0, 30),
        { note: '... (middle data omitted) ...' },
        ...cursorHistory.slice(-30),
      ]
    : cursorHistory;

  const prompt = `You are an expert reading comprehension tutor. Analyze a student's reading behavior and provide personalized feedback for their quiz answer.

**READING PASSAGE:**
${passage}

**QUESTION:**
${question}

**STUDENT'S ANSWER:**
${selectedAnswer}

**ANSWER STATUS:** ${isCorrect ? 'CORRECT' : 'INCORRECT'}

${isCorrect ? `**CORRECT ANSWER:** ${correctAnswer}` : ''}

**READING BEHAVIOR DATA:**
${trackingDataSummary ? `
- Total cursor points: ${trackingDataSummary.totalPoints}
- Reading duration: ${trackingDataSummary.duration.toFixed(1)} seconds
- Coordinate range: X: ${trackingDataSummary.coordinateRange.minX.toFixed(0)}-${trackingDataSummary.coordinateRange.maxX.toFixed(0)}, Y: ${trackingDataSummary.coordinateRange.minY.toFixed(0)}-${trackingDataSummary.coordinateRange.maxY.toFixed(0)}
` : '- No cursor tracking data available'}

**CURSOR TRACKING DATA (sample):**
\`\`\`json
${JSON.stringify(jsonSample, null, 2)}
\`\`\`

**YOUR TASK:**

Provide personalized, encouraging feedback based on:
1. Whether the answer was correct or incorrect
2. The student's reading patterns (from cursor data and heatmap)
3. How their reading behavior relates to finding the answer in the passage

**OUTPUT REQUIREMENTS:**
- Keep it SHORT: Maximum 2 sentences (20-30 words total)
- Be encouraging and constructive
- Reference specific reading behavior if data is available (e.g., "You spent time on the key paragraph" or "The answer was in the section you skimmed")
- For CORRECT answers: Celebrate and connect it to their reading approach
- For INCORRECT answers: ${isCorrect ? 'N/A' : 'Give hints about what part of the passage to focus on (e.g., "Focus on the second paragraph where the method is explained" or "Look for information about how researchers conducted the study"). DO NOT reveal the correct answer. Guide them to reread the relevant section so they can discover it themselves.'}
- No verbose explanations - be concise and direct

**OUTPUT FORMAT:**
Just provide the feedback text directly, no prefix or formatting.`;

  try {
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: prompt },
    ];

    // Add screenshot if available
    if (screenshot) {
      try {
        const imageData = base64ToGeminiFormat(screenshot);
        parts.push({
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.data,
          },
        });
      } catch (error) {
        console.warn('Failed to process screenshot for Gemini:', error);
      }
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text().trim();

    return {
      feedback: text || (isCorrect ? 'Correct! I love you.' : 'Try again! Focus on the passage to find the answer.'),
    };
  } catch (error: any) {
    console.error('Gemini API error:', error);
    
    // Fallback to default messages on error
    return {
      feedback: isCorrect ? 'Correct! I love you.' : 'Try again! Focus on the passage to find the answer.',
      error: 'Failed to generate personalized feedback. Using default.',
    };
  }
}


