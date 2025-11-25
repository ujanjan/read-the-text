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

${readingSummaryJson ? `
**SENTENCE-LEVEL READING SUMMARY (JSON):**

This JSON describes, for each sentence in the passage:
- its index and text
- total dwell time in milliseconds (\`dwell_ms\`)
- how many separate visits there were (\`visits\`)
- the order in which it was first visited (\`first_visit_order\`, where 0 = first sentence the student looked at).

Use this to reason precisely about which sentences the student focused on or skipped.

\`\`\`json
${readingSummaryJson}
\`\`\`
` : `
**SENTENCE-LEVEL READING SUMMARY:** Not available for this session.
`}

**CRITICAL INSTRUCTIONS FOR FEEDBACK GENERATION:**

You have *three* types of evidence:
1) The reading passage and its content  
2) Sentence-level reading behavior data (dwell_ms, visits, first_visit_order)  
3) Optional heatmap and cursor samples  

Use **all three**, but **prioritize them in this order**:

### 1. CONTENT-FIRST INSIGHT
Always reason about:
- what the question is actually asking,
- which parts of the passage support the correct reasoning,
- how a student should conceptually approach the question.

Your feedback **must help the student understand the passage and the reasoning process**, not just their behavior.

### 2. BEHAVIOR-AS-EVIDENCE (Secondary Signal)
Use reading behavior data as a **supporting diagnostic signal**, not the sole driver.
Examples:
- “You spent very little time on the sentence that explains X, which is key to the question.”
- “You focused most on the introduction, but the detail you needed was later in the passage.”
- “You revisited the sentence about Y, which suggests you were checking your interpretation.”

Behavior data must **never override actual passage meaning**.
If the behavior is unclear or contradictory, **fall back to content-based feedback**.

### 3. NO HALLUCINATION RULE
Do NOT:
- Guess that the student “read” something without evidence  
- Pretend behavior evidence is conclusive when it’s not  
- Invent reasoning pathways the student did not show  

When behavior data is inconclusive, say so briefly and then give normal content-based guidance.

---

**FOR INCORRECT ANSWERS:**
- Identify the part of the passage that *contains* the evidence (without revealing the answer).
- Use reading behavior to guide where they should re-read (“You spent little time on the sentence explaining X…”).
- Provide a conceptual hint grounded in the content (“Look at how the author describes the contrast between Y and Z…”).

**FOR CORRECT ANSWERS:**
- Praise accuracy and briefly reference *content* (“You connected the author’s explanation of X to the question — well done.”)
- Use behavior to reinforce metacognition (“You spent focused time on the key sentence about Y, which helped.”)
- If behavior didn’t match correctness (lucky guess), address that gently.

---

**OUTPUT REQUIREMENTS:**
- 2–3 sentences (max ~40 words total)
- Mix content-based insight + behavior insight
- Encouraging but precise
- No revealing answers
- When behavior is ambiguous, acknowledge it and rely on content

**OUTPUT FORMAT:**  
Just the feedback text. No bullet points, no headings.`;

  try {
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: prompt },
    ];

    // Log data being sent to Gemini
    console.log('📊 Sending to Gemini for personalized feedback:');
    console.log(`  - Passage text: ${passage.length} characters`);
    console.log(`  - Screenshot with heatmap: ${screenshot ? 'Yes' : 'No'}`);
    console.log(`  - Sentence-level reading summary JSON: ${readingSummaryJson ? 'Included' : 'Not included'}`);
    if (readingSummaryJson) {
      console.log(`    - ${readingSummaryJson}`);
    }

    // Add screenshot if available
    if (screenshot && !readingSummaryJson) {
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


