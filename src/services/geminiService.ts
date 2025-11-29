import { GoogleGenerativeAI } from '@google/generative-ai';
import { debugLog } from '../utils/logger';

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
 * Provides personalized feedback using Variant C prompt (Strategy Focus)
 * Note: Cursor data is tracked and stored but NOT sent to Gemini API (only heatmap screenshot)
 */
export async function getPersonalizedQuestionFeedbackVariantC(
  title: string,
  passage: string,
  screenshot: string | null,
  question: string,
  selectedAnswer: string,
  correctAnswer: string,
  isCorrect: boolean,
  readingSummaryJson?: string
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

  const prompt = `Give short reading-comprehension feedback (max 70 words).
Inputs: passage, question, answer choices, student’s choice, a heatmap image of their reading, and a JSON list of sentences levels.

**READING PASSAGE:**
${title ? `**Title:** ${title}\n\n` : ''}${passage}

**QUESTION:**
${question}

**STUDENT'S ANSWER:**
${selectedAnswer}

**ANSWER STATUS:** ${isCorrect ? 'CORRECT' : 'INCORRECT'}

${isCorrect ? `**CORRECT ANSWER:** ${correctAnswer}` : ''}

**READING BEHAVIOR ANALYSIS:**

${screenshot ? `
**HEATMAP IMAGE:** A visual heatmap is attached showing where the cursor spent time during reading. Bright/green areas indicate more time spent. Dark areas indicate less or no time spent. This shows which sections of the passage the student focused on.
` : '**HEATMAP IMAGE:** Not available - provide general feedback without reading behavior analysis.'}

${readingSummaryJson ? `
**SENTENCE-LEVEL READING SUMMARY (JSON):**

This JSON describes, for each sentence in the passage:
- its index and text
- total dwell time in milliseconds (\`dwell_ms\`)
- how many separate visits there were (\`visits\`)
- the order in which it was first visited (\`first_visit_order\`, where 0 = first sentence the student looked at).

\`\`\`json
${readingSummaryJson}
\`\`\`
` : `
**SENTENCE-LEVEL READING SUMMARY:** Not available for this session.
`}

Use the heatmap/JSON to infer which parts of the text the student focused on, reread, or skipped. Describe how they used (or missed) useful clues and how that led to their answer.

CRITICAL: Do NOT mention "heatmap" or "data". Phrase observations naturally (e.g. "You focused on...").

End with one concrete strategy suggestion (e.g., re-checking key sentences, summarizing, comparing options).`;

  try {
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: prompt },
    ];

    // Log data being sent to Gemini
    debugLog('📊 Sending to Gemini for personalized feedback (VARIANT C - STRATEGY):');
    debugLog(`  - Passage text: ${passage.length} characters`);
    debugLog(`  - Screenshot with heatmap: ${screenshot ? 'Yes' : 'No'}`);
    debugLog(`  - Sentence-level reading summary JSON: ${readingSummaryJson ? 'Included' : 'Not included'}`);

    // Add screenshot if available (always include for this variant)
    if (screenshot) {
      try {
        const imageData = base64ToGeminiFormat(screenshot);
        parts.push({
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.data,
          },
        });
        debugLog(`  ✅ Screenshot with heatmap added (${imageData.mimeType}, ${Math.round(imageData.data.length / 1024)}KB)`);
      } catch (error) {
        console.warn('Failed to process screenshot for Gemini:', error);
      }
    } else {
      debugLog('  ⚠️ No screenshot available - feedback will be based on text only');
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text().trim();

    debugLog('═══════════════════════════════════════════════════════');
    debugLog('📥 [GEMINI RAW RESPONSE - VARIANT C]');
    debugLog('═══════════════════════════════════════════════════════');
    debugLog('Raw text length:', response.text().length);
    debugLog('Trimmed text length:', text.length);
    debugLog('First 200 chars:', text.substring(0, 200));
    debugLog('═══════════════════════════════════════════════════════');

    return {
      feedback: text || (isCorrect ? 'Correct! I love you.' : 'Try again! Focus on the passage to find the answer.'),
    };
  } catch (error: any) {
    console.error('Gemini API error:', error);

    // Handle rate limiting specifically
    if (error.message?.includes('429') || error.message?.includes('Resource exhausted') || error.message?.includes('rate limit')) {
      return {
        feedback: isCorrect
          ? 'Correct! (Personalized feedback temporarily unavailable due to rate limits. Please wait a moment before submitting again.)'
          : 'Try again! Focus on the passage to find the answer. (Personalized feedback temporarily unavailable due to rate limits.)',
        error: 'Rate limit exceeded. Please wait a moment before submitting again.',
      };
    }

    // Fallback to default messages on error
    return {
      feedback: isCorrect ? 'Correct! I love you.' : 'Try again! Focus on the passage to find the answer.',
      error: 'Failed to generate personalized feedback. Using default.',
    };
  }
}
