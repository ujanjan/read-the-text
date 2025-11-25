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
 * Provides personalized feedback for quiz question answers based on reading behavior
 * Note: Cursor data is tracked and stored but NOT sent to Gemini API (only heatmap screenshot)
 */
export async function getPersonalizedQuestionFeedback(
  title: string,
  passage: string,
  screenshot: string | null,
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

  const prompt = `You are an expert reading comprehension tutor. Analyze a student's reading behavior and provide personalized feedback for their quiz answer.

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

**CRITICAL INSTRUCTIONS FOR READING BEHAVIOR ANALYSIS:**

1. **ONLY make claims about reading behavior if you have CLEAR EVIDENCE:**
   - Analyze which paragraphs/sections show bright areas (read) vs dark areas (not read or skimmed)
   - DO NOT assume the student read something if there's no heatmap evidence
   - Be specific about which parts of the passage show attention

2. **Be accurate and specific:**
   - If the heatmap shows the student skipped the beginning, say so
   - If the heatmap shows the student focused on the middle paragraphs, reference that
   - If the heatmap shows the student only read the end, mention that
   - DO NOT make false claims about what they read

3. **For INCORRECT answers:**
   - Identify which paragraph contains the answer
   - Check if the heatmap shows the student actually read that paragraph
   - If they didn't read it: Guide them to that specific paragraph
   - If they did read it: Suggest they reread it more carefully
   - DO NOT reveal the correct answer

**YOUR TASK:**

Provide personalized, encouraging feedback based on ACTUAL heatmap evidence:
1. Whether the answer was correct or incorrect
2. What the heatmap shows about what was actually read
3. Where in the passage the answer can be found (for incorrect answers)

**CRITICAL: ALWAYS ANALYZE READING BEHAVIOR WHEN HEATMAP IS AVAILABLE**

For CORRECT answers:
- First, identify which paragraph(s) contain the information needed to answer this question
- Then, check the heatmap to see if the student actually read those paragraph(s)
- If the heatmap shows they DID read the relevant parts: Celebrate and connect it to their reading approach
- If the heatmap shows they DID NOT read the relevant parts: Acknowledge the correct answer BUT mention that their heatmap shows they mostly read other sections, and suggest they read the relevant section more carefully next time

**OUTPUT REQUIREMENTS:**
- Keep it SHORT: Maximum 2-3 sentences (30-40 words total)
- Be encouraging and constructive
- ALWAYS analyze reading behavior if heatmap is available
- For CORRECT answers:
  - If they read the relevant parts: Celebrate and connect it to their reading approach
  - If they DIDN'T read the relevant parts: Acknowledge the correct answer BUT point out the heatmap shows they didn't focus on the relevant paragraph(s)
- For INCORRECT answers: ${isCorrect ? 'N/A' : 'Give hints about which paragraph to focus on. DO NOT reveal the correct answer. If the heatmap shows they didn\'t read that paragraph, guide them there. If they did read it, suggest rereading more carefully.'}
- If no heatmap is available, just provide general encouraging guidance

**OUTPUT FORMAT:**
Just provide the feedback text directly, no prefix or formatting.`;

  try {
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: prompt },
    ];

    // Log data being sent to Gemini
    console.log('📊 Sending to Gemini for personalized feedback:');
    console.log(`  - Passage text: ${passage.length} characters`);
    console.log(`  - Screenshot with heatmap: ${screenshot ? 'Yes' : 'No'}`);
    console.log(`  - Note: Cursor data is NOT sent to Gemini (only visual heatmap)`);

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
        console.log(`  ✅ Screenshot with heatmap added (${imageData.mimeType}, ${Math.round(imageData.data.length / 1024)}KB)`);
      } catch (error) {
        console.warn('Failed to process screenshot for Gemini:', error);
      }
    } else {
      console.log('  ⚠️ No screenshot available - feedback will be based on text only');
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text().trim();

    console.log('═══════════════════════════════════════════════════════');
    console.log('📥 [GEMINI RAW RESPONSE]');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Raw text length:', response.text().length);
    console.log('Trimmed text length:', text.length);
    console.log('First 200 chars:', text.substring(0, 200));
    console.log('═══════════════════════════════════════════════════════');

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


