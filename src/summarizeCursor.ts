export type CursorPoint = { x: number; y: number; timestamp: number };

export type SentenceRect = {
  id: number;
  text: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type ReadingSummary = {
  total_time_ms: number;
  sentences: Array<{
    index: number;
    text: string;
    dwell_ms: number;
    visits: number;
    first_visit_order: number | null;
  }>;
};

// Small margin so near-boundary points still count
const HIT_MARGIN = 2;
const MAX_DT = 4000; // cap gaps at 4s so huge pauses don't dominate

function findSentenceForPoint(
  x: number,
  y: number,
  sentenceRects: SentenceRect[]
): SentenceRect | null {
  for (const rect of sentenceRects) {
    if (
      x >= rect.left - HIT_MARGIN &&
      x <= rect.right + HIT_MARGIN &&
      y >= rect.top - HIT_MARGIN &&
      y <= rect.bottom + HIT_MARGIN
    ) {
      return rect;
    }
  }
  return null;
}

type SentenceStats = {
  dwell_ms: number;
  visits: number;
  firstVisitOrder: number | null;
};

export function computeSentenceRects(
  container: HTMLElement,
  sentenceSelector = "[data-sentence-id]"
): SentenceRect[] {
  // Get every <span data-sentence-id="...">
  const sentenceElements = Array.from(
    container.querySelectorAll<HTMLElement>(sentenceSelector)
  );

  return sentenceElements.map((el) => {
    const r = el.getBoundingClientRect();

    // Use viewport coordinates directly to match global cursor coordinates
    return {
      id: parseInt(el.dataset.sentenceId || "0", 10),
      text: el.innerText,
      left: r.left,
      top: r.top,
      right: r.right,
      bottom: r.bottom,
    };
  });
}


export function summarizeCursorSession(
  points: CursorPoint[],
  sentenceRects: SentenceRect[]
): ReadingSummary {
  if (points.length === 0) {
    return {
      total_time_ms: 0,
      sentences: sentenceRects.map((rect) => ({
        index: rect.id,
        text: rect.text,
        dwell_ms: 0,
        visits: 0,
        first_visit_order: null,
      })),
    };
  }

  // 1) Sort points by time to be safe
  const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);

  // 2) Precompute dt for each point (time until next point)
  const dts: number[] = new Array(sorted.length).fill(0);
  for (let i = 0; i < sorted.length - 1; i++) {
    const rawDt = sorted[i + 1].timestamp - sorted[i].timestamp;
    // ignore negative, cap huge gaps
    const clamped = Math.max(0, Math.min(rawDt, MAX_DT));
    dts[i] = clamped;
  }
  // last point gets dt = 0 (we don’t know how long they stayed after)

  const statsMap = new Map<number, SentenceStats>();
  const visitOrder: number[] = []; // order in which sentences are first visited

  let prevSentenceId: number | null = null;

  // 3) Assign each point to a sentence and update dwell/visits
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const dt = dts[i];

    const rect = findSentenceForPoint(p.x, p.y, sentenceRects);
    const sentenceId = rect ? rect.id : null;

    if (sentenceId === null) {
      // break the current visit streak if we left the text region
      prevSentenceId = null;
      continue;
    }

    let s = statsMap.get(sentenceId);
    if (!s) {
      s = { dwell_ms: 0, visits: 0, firstVisitOrder: null };
      statsMap.set(sentenceId, s);
    }

    // Add dwell time
    s.dwell_ms += dt;

    // New visit if we just entered this sentence from another one / from outside
    if (prevSentenceId !== sentenceId) {
      s.visits += 1;

      if (s.firstVisitOrder === null) {
        s.firstVisitOrder = visitOrder.length;
        visitOrder.push(sentenceId);
      }
    }

    prevSentenceId = sentenceId;
  }

  // 4) Compute total time as span from first to last timestamp
  const total_time_ms =
    sorted[sorted.length - 1].timestamp - sorted[0].timestamp;

  // 5) Build ReadingSummary.sentences array, including untouched sentences
  const sentences = sentenceRects.map((rect) => {
    const s = statsMap.get(rect.id);
    return {
      index: rect.id,
      text: rect.text,
      dwell_ms: Math.round(s?.dwell_ms ?? 0),
      visits: s?.visits ?? 0,
      first_visit_order: s?.firstVisitOrder ?? null,
    };
  });

  return {
    total_time_ms,
    sentences,
  };
}
