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

  // Prepare the prompt
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

  const prompt = `You are analyzing reading comprehension behavior based on:
1. The reading passage text
2. A heatmap screenshot showing where the reader focused their attention (cursor movements)
3. Cursor tracking data with coordinates

Tracking Data Summary:
- Total cursor points: ${trackingDataSummary.totalPoints}
- Reading duration: ${trackingDataSummary.duration.toFixed(1)} seconds
- Coordinate range: ${trackingDataSummary.coordinateRange ? `X: ${trackingDataSummary.coordinateRange.minX.toFixed(0)}-${trackingDataSummary.coordinateRange.maxX.toFixed(0)}, Y: ${trackingDataSummary.coordinateRange.minY.toFixed(0)}-${trackingDataSummary.coordinateRange.maxY.toFixed(0)}` : 'N/A'}

Reading Passage:
${passage}

Please analyze the heatmap (if provided) and cursor tracking data to provide brief, actionable tips for improving reading comprehension. Focus on:
- Areas where the reader spent more/less time (based on heatmap intensity)
- Reading patterns and potential issues
- Specific suggestions for better comprehension

Keep tips brief and to the point (2-4 bullet points or short paragraphs).`;

  try {
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
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


