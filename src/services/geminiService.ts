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
 */
export async function getPersonalizedQuestionFeedback(
  title: string,
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

  // OPTIMIZATION: Send only a sample of cursor data instead of ALL points
  // This dramatically reduces token usage while maintaining analytical value
  // Strategy: Evenly distribute 100 points from beginning to end
  let jsonData: CursorData[] = cursorHistory;
  if (cursorHistory.length > 100) {
    const sampleSize = 100; // Sample 100 points evenly distributed
    const step = Math.floor(cursorHistory.length / sampleSize);
    const sampledPoints: CursorData[] = [];
    
    // Evenly distribute 100 points from beginning to end
    for (let i = 0; i < cursorHistory.length && sampledPoints.length < sampleSize; i += step) {
      sampledPoints.push(cursorHistory[i]);
    }
    
    // Ensure we always include the very last point
    if (sampledPoints[sampledPoints.length - 1] !== cursorHistory[cursorHistory.length - 1]) {
      sampledPoints.push(cursorHistory[cursorHistory.length - 1]);
    }
    
    jsonData = sampledPoints;
    console.log(`🔽 [SAMPLING] Reduced cursor data from ${cursorHistory.length} to ${jsonData.length} points`);
  } else {
    console.log(`✅ [NO SAMPLING] Cursor data size (${cursorHistory.length}) is under threshold, sending all points`);
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
**HEATMAP IMAGE:** A visual heatmap is attached showing where the cursor spent time. Bright/green areas indicate more time spent. Dark areas indicate less or no time spent. This is the PRIMARY source of truth for what the student actually read.
` : '**HEATMAP IMAGE:** Not available - you must rely only on cursor coordinate data.'}

${trackingDataSummary ? `
**CURSOR TRACKING SUMMARY:**
- Total cursor points: ${trackingDataSummary.totalPoints}
- Reading duration: ${trackingDataSummary.duration.toFixed(1)} seconds
- Coordinate range: X: ${trackingDataSummary.coordinateRange.minX.toFixed(0)}-${trackingDataSummary.coordinateRange.maxX.toFixed(0)}, Y: ${trackingDataSummary.coordinateRange.minY.toFixed(0)}-${trackingDataSummary.coordinateRange.maxY.toFixed(0)}

**CURSOR TRACKING DATA (sampled for efficiency - ${jsonData.length} of ${cursorHistory.length} total points):**
\`\`\`json
${JSON.stringify(jsonData)}
\`\`\`

**IMPORTANT:** The cursor coordinates are screen coordinates. To understand what parts of the passage were actually read, you MUST analyze the heatmap image (if available). The heatmap shows the visual distribution of cursor time spent over the passage text.
` : '**CURSOR TRACKING DATA:** No cursor tracking data available.'}

**CRITICAL INSTRUCTIONS FOR READING BEHAVIOR ANALYSIS:**

1. **ONLY make claims about reading behavior if you have CLEAR EVIDENCE:**
   - If heatmap is available: Analyze which paragraphs/sections show bright areas (read) vs dark areas (not read or skimmed)
   - If no heatmap: Use cursor Y-coordinates to infer vertical position in the passage (higher Y = earlier in passage, lower Y = later)
   - DO NOT assume the student read something if there's no evidence

2. **Be accurate and specific:**
   - If the heatmap shows the student skipped the beginning, say so
   - If the heatmap shows the student focused on the middle paragraphs, reference that
   - If the heatmap shows the student only read the end, mention that
   - DO NOT claim they read parts that show no cursor activity in the heatmap

3. **For INCORRECT answers:**
   - Identify which paragraph contains the answer
   - Check if the heatmap shows the student actually read that paragraph
   - If they didn't read it: Guide them to that specific paragraph
   - If they did read it: Suggest they reread it more carefully
   - DO NOT reveal the correct answer

**YOUR TASK:**

Provide personalized, encouraging feedback based on ACTUAL reading behavior evidence:
1. Whether the answer was correct or incorrect
2. What the heatmap/cursor data shows about what was actually read
3. Where in the passage the answer can be found (for incorrect answers)

**CRITICAL: ALWAYS ANALYZE READING BEHAVIOR, EVEN FOR CORRECT ANSWERS**

For CORRECT answers:
- First, identify which paragraph(s) contain the information needed to answer this question
- Then, check the heatmap/cursor data to see if the student actually read those paragraph(s)
- If the reading tracking data shows they DID read the relevant parts: Celebrate and connect it to their reading approach
- If the reading tracking data shows they DID NOT read the relevant parts (e.g., they only read other paragraphs): You MUST mention this! Say something like "Great job getting the correct answer! However, your reading tracking data shows you mostly read [paragraph X and Y], while the answer is actually found in [paragraph Z]. Consider reading that section more carefully next time to ensure you're finding answers based on the text."

**OUTPUT REQUIREMENTS:**
- Keep it SHORT: Maximum 2-3 sentences (30-40 words total)
- Be encouraging and constructive
- ALWAYS analyze reading behavior if cursor tracking data is available
- For CORRECT answers: 
  - If they read the relevant parts: Celebrate and connect it to their reading approach
  - If they DIDN'T read the relevant parts: Acknowledge the correct answer BUT mention that their reading tracking data doesn't show they read the relevant paragraph(s), and suggest they read those sections
- For INCORRECT answers: ${isCorrect ? 'N/A' : 'Give hints about which paragraph to focus on based on where the answer actually is. DO NOT reveal the correct answer. If the heatmap shows they didn\'t read that paragraph, guide them there. If they did read it, suggest rereading more carefully.'}
- If you cannot determine reading behavior from the data, just provide general guidance without making false claims

**OUTPUT FORMAT:**
Just provide the feedback text directly, no prefix or formatting.`;

  try {
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: prompt },
    ];

    // Log data being sent to Gemini
    console.log('📊 Sending to Gemini for personalized feedback:');
    console.log(`  - Cursor history points: ${cursorHistory.length} (sending ${jsonData.length} evenly distributed points)`);
    console.log(`  - Screenshot available: ${screenshot ? 'Yes' : 'No'}`);
    console.log(`  - Token optimization: ${cursorHistory.length > 100 ? `Sampled ${jsonData.length} evenly distributed points from ${cursorHistory.length} total` : 'No sampling needed'}`);

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
        console.log(`  ✅ Screenshot added (${imageData.mimeType}, ${Math.round(imageData.data.length / 1024)}KB)`);
      } catch (error) {
        console.warn('Failed to process screenshot for Gemini:', error);
      }
    } else {
      console.log('  ⚠️ No screenshot available - feedback will be based on text and JSON only');
    }

    if (cursorHistory.length === 0) {
      console.log('  ⚠️ No cursor tracking data - feedback will be based on passage and question only');
    } else {
      console.log(`  ✅ Cursor tracking data included (${jsonData.length} evenly distributed points sent)`);
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


