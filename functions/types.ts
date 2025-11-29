/// <reference types="@cloudflare/workers-types" />

export interface Env {
  read_the_text_db: D1Database;
  read_the_text_storage: R2Bucket;
  BREVO_API_KEY: string;
  BREVO_SENDER_EMAIL?: string;
  BREVO_SENDER_NAME?: string;
  ADMIN_PASSWORD: string;
  GEMINI_API_KEY?: string;
  VITE_GEMINI_API_KEY?: string;
  // Note: ASSETS binding removed - not available in Workers deployment
  // Static assets are served by Cloudflare's platform before worker executes
}

// Helper functions
export function shuffleArray(array: number[]): number[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate UUID v4
export function generateUUID(): string {
  return crypto.randomUUID();
}
