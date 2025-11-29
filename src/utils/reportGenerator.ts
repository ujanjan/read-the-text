import { SessionData } from '../types/session';

export const generateReportPrompt = (sessionData: SessionData): string => {
    const { session, passageResults, attempts, questionnaireResponse } = sessionData;

    // Calculate stats
    const totalPassages = 10;
    const completedPassages = passageResults.filter(p => p.is_complete).length;
    const firstAttemptCorrect = passageResults.filter(p => p.wrong_attempts === 0 && p.is_complete).length;
    const firstAttemptAccuracy = Math.round((firstAttemptCorrect / totalPassages) * 100);

    // Calculate persistence (passages with wrong attempts but eventually completed)
    const persistentPassages = passageResults.filter(p => p.wrong_attempts > 0 && p.is_complete).length;

    // Prepare sanitized data for Gemini
    const analysisData = {
        participant_name: session.email ? session.email.split('@')[0] : 'Reader',
        stats: {
            total_passages: totalPassages,
            completed: completedPassages,
            first_attempt_accuracy_percent: firstAttemptAccuracy,
            passages_with_wrong_attempts_solved: persistentPassages,
            total_time_minutes: Math.round((session.total_time_ms || 0) / 60000),
        },
        passages: passageResults.map(p => ({
            index: p.passage_index + 1,
            time_spent_seconds: Math.round(p.time_spent_ms / 1000),
            wrong_attempts: p.wrong_attempts,
            is_perfect: p.wrong_attempts === 0
        })),
        questionnaire: questionnaireResponse ? {
            confidence: questionnaireResponse.question_1_response, // Assuming Q1 is about impression/confidence
            feedback: questionnaireResponse.question_3_response
        } : null
    };

    return `
You are an expert reading coach and data analyst. Your goal is to generate a personalized "Reading Insights Report" for a student based on their reading comprehension quiz data.

**Input Data:**
${JSON.stringify(analysisData, null, 2)}

**Instructions:**

1.  **Analyze the Data:**
    *   **First-Attempt Accuracy:** Calculate the percentage of passages solved with 0 wrong attempts.
    *   **Persistence:** Identify if the user kept trying on difficult passages.
    *   **Speed:** Evaluate their average time per passage (fast < 2 min, medium 2-4 min, slow > 4 min).

2.  **Determine the "Reading Spirit Animal" 🐾:**
    Choose ONE of the following based on the logic:
    *   🦅 **The Eagle** (High First-Attempt Accuracy > 80%): Precise, sharp focus, spots details from afar.
    *   🐢 **The Turtle** (High Persistence, many wrong attempts but finished): Slow and steady, never gives up, resilient.
    *   🐆 **The Cheetah** (Fast Speed + High Accuracy): Agile, fast processor, efficient.
    *   🦉 **The Owl** (High Dwell Time/Slow Speed + Good Accuracy): Wise, observant, takes time to understand deeply.
    *   🐝 **The Bee** (Non-Linear/Scanning or Mixed Performance): Flits around, busy but productive.

3.  **Generate the Report (Markdown Format):**
    *   **Title:** "📚 Your Reading Insights Report"
    *   **Section 1: Your Reading Spirit Animal:** State the animal and emoji. Explain *why* based on their specific data (e.g., "Because you nailed 8/10 passages on the first try...").
    *   **Section 2: Performance Highlights 🏆:** Bullet points celebrating specific achievements (e.g., "100% First-Try Accuracy", "Persistence Master", "Speedy Reader").
    *   **Section 3: Deep Dive 🧠:** Briefly analyze their reading style (linear vs. scanning, speed, focus).
    *   **Section 4: Personalized Tips 🌱:** Give 2-3 actionable tips based on their weak points (e.g., if low accuracy, suggest slowing down; if high accuracy but slow, suggest skimming).

**Tone:** Enthusiastic, insightful, professional but accessible. Use emojis.
**Output:** Return ONLY the Markdown content. Do not include any other text.
`;
};
